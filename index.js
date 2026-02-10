/* ===================== ELEMENT ===================== */
const elements = {
  result: document.getElementById("result"),
  calcul: document.getElementById("calcul"),
  historyList: document.getElementById("historyList"),
  showAllBtn: document.getElementById("full-history"),
  clearBtn: document.getElementById("clear-history"),
  notification: document.getElementById("notification"),
  sumBtn: document.getElementById("sum-selected"),
  unselect: document.getElementById("unselect"),
  historyBtn: document.getElementById("history-btn"),
  backCalculate: document.getElementById("back-cal"),
  checkedResult: document.getElementById("check-resutl-total"),
};

/* ===================== STATE ===================== */
const state = {
  history: JSON.parse(localStorage.getItem("historyCalculator")) || [],
  selectedItems: new Set(),
  showAll: false,
  justCalculated: false,
  isEditing: false,
  editId: null,
  pressTimer: null,
  showHistory: false,
  checkedAll: false,
};

/* ===================== FORMAT ===================== */

const Formatter = {
  formatNumber(numStr) {
    let [int, dec] = numStr.toString().split(".");
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return dec !== undefined ? `${int},${dec}` : int;
  },

  displayToRaw(str) {
    return str
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/([\d.]+)(%)/g, "($1/100)");
  },

  renderExpression(raw) {
    return raw
      .replace(/\d+(\.\d+)?/g, (m) => this.formatNumber(m))
      .replace(/\*/g, "×")
      .replace(/\//g, "÷");
  },
};

/* ===================== VALIDATE ===================== */

function isValidExpression(exp) {
  if (!exp) return false;
  if (/[+\-*/.(]$/.test(exp)) return false;
  try {
    Function(`"use strict"; return (${exp})`)();
    return true;
  } catch {
    return false;
  }
}

/* ===================== AUTO CALC ===================== */

// function autoCalculate(expression) {
//   try {
//     let raw = Formatter.displayToRaw(expression);

//     // Nếu biểu thức kết thúc bằng toán tử (+, -, *, /),
//     // ta tạm thời cắt bỏ nó để tính toán phần số đã nhập phía trước.
//     if (/[+\-*/.]$/.test(raw)) {
//       raw = raw.slice(0, -1);
//     }

//     if (!raw) return null;

//     const res = new Function(`"use strict"; return (${raw})`)();
//     if (isNaN(res) || !isFinite(res)) return null;

//     let finalResult;
//     const resultStr = res.toString();
//     const digitCount = resultStr.replace(/[^0-9]/g, "").length;

//     if (digitCount > 9) {
//       if (Math.abs(res) >= 1e9 || (Math.abs(res) < 1e-7 && res !== 0)) {
//         // Nếu số quá lớn hoặc quá nhỏ: Chuyển sang dạng số mũ (e) nhưng vẫn giới hạn độ dài
//         finalResult = res.toPrecision(5).toString();
//       } else {
//         // Nếu là số thập phân dài: Giới hạn tổng cộng 9 chữ số có nghĩa
//         finalResult = Number(res.toPrecision(9)).toString();
//       }
//     } else {
//       finalResult = resultStr;
//     }

//     return Number(Math.round(finalResult + "e10") + "e-10");
//   } catch (e) {
//     return null;
//   }
// }
function autoCalculate(expression) {
  try {
    // 1. Chuyển đổi hiển thị sang định dạng tính toán thuần túy (x -> *, , -> .)
    // Sử dụng cú pháp replace(/\*/g, "x") ngược lại tại đây nếu cần
    let raw = Formatter.displayToRaw(expression);

    // 2. Nếu biểu thức kết thúc bằng toán tử (+, -, *, /),
    // ta tạm thời cắt bỏ nó để tính toán phần số đã nhập phía trước.
    if (/[+\-*/.]$/.test(raw)) {
      raw = raw.slice(0, -1);
    }

    if (!raw.trim()) return null;

    // 3. Thực hiện tính toán an toàn
    const res = new Function(`"use strict"; return (${raw})`)();

    if (res === undefined || res === null || isNaN(res) || !isFinite(res))
      return null;

    // 4. Xử lý giới hạn chữ số hiển thị (9 chữ số)
    let finalResult;
    const resultStr = res.toString();
    const digitCount = resultStr.replace(/[^0-9]/g, "").length;

    if (digitCount > 9) {
      if (Math.abs(res) >= 1e9 || (Math.abs(res) < 1e-7 && res !== 0)) {
        // Số quá lớn hoặc quá nhỏ: Chuyển sang dạng khoa học (e)
        finalResult = res.toPrecision(5).toString();
      } else {
        // Số thập phân dài: Giới hạn 9 chữ số có nghĩa
        finalResult = Number(res.toPrecision(9)).toString();
      }
    } else {
      finalResult = resultStr;
    }

    // return Number(finalResult);
    return finalResult;
  } catch (e) {
    return null;
  }
}

/* ===================== INPUT ===================== */

function addToNumber(n) {
  if (state.justCalculated) {
    elements.result.innerText = "";
    elements.calcul.innerText = "0";
    state.justCalculated = false;
  }

  // 1️⃣ lấy raw
  let currentRaw = Formatter.displayToRaw(elements.result.innerText);

  // 2️⃣ số cuối cùng
  let lastNumber = currentRaw.split(/[+\-*/()]/).pop();

  let digitCount = lastNumber.replace(".", "").length;

  if (digitCount >= 9) {
    return;
  }

  // 3️⃣ chặn nhiều dấu thập phân
  if (n === "." && lastNumber.includes(".")) return;

  // 4️⃣ thêm vào raw
  const newRaw = currentRaw + n;

  // 5️⃣ render lại UI
  elements.result.innerText = Formatter.renderExpression(newRaw);

  // 6️⃣ auto calc
  const autoRes = autoCalculate(elements.result.innerText);

  if (autoRes !== null) {
    elements.calcul.innerText = Formatter.formatNumber(autoRes);
  }
}

function addToResult(op) {
  if (!elements.result.innerText) return;

  // Tránh nhập liên tiếp dấu toán tử hoặc dấu % rồi đến toán tử
  if (/[+×÷\-]$/.test(elements.result.innerText)) {
    // Nếu bấm toán tử khác khi đã có toán tử, thì thay thế toán tử cũ
    elements.result.innerText = elements.result.innerText.slice(0, -1);
  }

  const map = { "*": "×", "/": "÷" };
  elements.result.innerText += map[op] || op;
  state.justCalculated = false;

  // Lấy kết quả tạm tính trước đó để hiển thị trong khi chờ số tiếp theo
  const currentRaw = Formatter.displayToRaw(
    elements.result.innerText.slice(0, -1),
  );
  const tempRes = autoCalculate(currentRaw);
  if (tempRes !== null) {
    elements.calcul.innerText = Formatter.formatNumber(tempRes);
  }
}

/* ===================== +/- FIX ===================== */

function toggleSign() {
  const exp = elements.result.innerText;
  if (!exp) return;

  // Regex này tìm nhóm số (có thể kèm ngoặc hoặc % ) ở cuối chuỗi
  const match = exp.match(/(.*?)(-?\(?\d+([.,]\d+)?\)?%?)$/);
  if (!match) return;

  let before = match[1];
  let number = match[2];

  if (number.startsWith("-(") && number.endsWith(")")) {
    number = number.slice(2, -1); // Bỏ dấu âm và ngoặc
  } else {
    number = `-(${number})`; // Thêm dấu âm và ngoặc
  }

  elements.result.innerText = before + number;

  // Cập nhật kết quả tính toán ngay lập tức
  const res = autoCalculate(elements.result.innerText);
  if (res !== null) {
    elements.calcul.innerText = Formatter.formatNumber(res);
  }
}

function percent() {
  const exp = elements.result.innerText;
  if (!exp || /%$/.test(exp)) return; // Nếu đã có % ở cuối thì không cho thêm nữa

  // Sửa Regex để bắt được cả số nằm trong ngoặc (số âm)
  const match = exp.match(/(.*?)(\(?\d+([.,]\d+)?\)?)$/);
  if (!match) return;

  elements.result.innerText = match[1] + match[2] + "%";

  const autoRes = autoCalculate(elements.result.innerText);
  if (autoRes !== null) {
    elements.calcul.innerText = Formatter.formatNumber(autoRes);
  }
}

/* ===================== CONTROL ===================== */

function clearResult() {
  elements.result.innerText = "";
  elements.calcul.innerText = "0";
  state.justCalculated = false;
  state.isEditing = false;
  state.editId = null;
}

function backspace() {
  elements.result.innerText = elements.result.innerText.slice(0, -1);

  if (elements.result.innerText.length === 0) {
    elements.calcul.innerText = "0";
    return;
  }

  autoCalculate(elements.result.innerText);
}

function calculate() {
  const res = autoCalculate(elements.result.innerText);
  if (res === null) return;

  const formattedRes = Formatter.formatNumber(res);
  const historyEntry = `${elements.result.innerText} = ${formattedRes}`;

  if (state.isEditing) {
    const idx = state.history.findIndex((item) => item.id === state.editId);
    if (idx !== -1) {
      state.history[idx].text = historyEntry;
      state.history[idx].value = res;
    }
    state.isEditing = false;
    state.editId = null;
  } else {
    state.history.unshift({
      id: Date.now(),
      text: historyEntry,
      value: res,
      isChecked: false,
    });
    if (state.history.length > 15) state.history.pop();
  }

  elements.calcul.innerText = formattedRes;
  elements.result.innerText = formattedRes;
  state.justCalculated = true;
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem("historyCalculator", JSON.stringify(state.history));
  renderHistory();
}

function totalOfCalculationsChecked() {
  const selectedValues = state.history.filter((op) => op.isChecked === true);

  const total = selectedValues.reduce(
    (acc, curr) => acc + Number(curr.value),
    0,
  );

  elements.checkedResult.value = Formatter.formatNumber(total);
  state.justCalculated = true;
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  const itemsToShow = state.showAll
    ? state.history
    : state.history.slice(0, 10);

  itemsToShow.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const isChecked = state.selectedItems.has(item.id);

    li.innerHTML = `
      <input type="checkbox" ${isChecked ? "checked" : ""} name="sum-calcul" data-id="${item.id}">
      <span class="history-text">${item.text}</span>
      <button class="delete-btn" id ="delete-item">Xóa</button>
    `;

    // Sự kiện checkbox
    li.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) state.selectedItems.add(item.id);
      else state.selectedItems.delete(item.id);
      item.isChecked = e.target.checked;
      totalOfCalculationsChecked();

      const isChecked = state.history.every((i) => i.isChecked === true);
      state.checkedAll = isChecked;
      isChecked
        ? (elements.unselect.innerHTML = `<i class="fa-solid fa-square-check"></i> Unselect`)
        : (elements.unselect.innerHTML = `<i class="fa-solid fa-square-check"></i> SelectAll`);
    });

    li.querySelector("input").addEventListener("touchstart", (e) => {
      e.stopPropagation(); // Ngăn không cho touch truyền lên thẻ li (không kích hoạt long press)
    });
    li.querySelector("input").addEventListener("click", (e) => {
      e.stopPropagation(); // Đảm bảo click không truyền lên li
    });

    li.querySelector(".history-text").addEventListener("click", () => {
      // Xóa highlight ở TẤT CẢ các dòng khác trước
      document.querySelectorAll(".history-text").forEach((el) => {
        el.classList.remove("high-light");
      });

      // Thêm highlight vào dòng vừa được click
      li.querySelector(".history-text").classList.add("high-light");
    });

    // Sự kiện Click để recall
    li.querySelector(".history-text").addEventListener("dblclick", () => {
      const [exp, res] = item.text.split(" = ");
      elements.result.innerText = exp;
      elements.calcul.innerText = res;
      state.isEditing = true;
      state.editId = item.id;
      state.justCalculated = false;
      state.showHistory = false;
      document.getElementById("container-history").style.display = "none";
      document.querySelectorAll(".history-text").forEach((el) => {
        el.classList.remove("high-light");
      });
    });
    li.addEventListener("touchstart", () => {
      state.pressTimer = setTimeout(() => {
        const [exp, res] = item.text.split(" = ");
        elements.result.innerText = exp;
        elements.calcul.innerText = res;
        state.isEditing = true;
        state.editId = item.id;
        state.justCalculated = false;
        state.showHistory = false;
        document.getElementById("container-history").style.display = "none";
        document.querySelectorAll(".history-text").forEach((el) => {
          el.classList.remove("high-light");
        });
      }, 600); // 600ms = long press
    });

    li.addEventListener("touchend", () => {
      clearTimeout(state.pressTimer);
    });

    li.addEventListener("touchmove", () => {
      clearTimeout(state.pressTimer);
    });

    // Sự kiện xóa
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.history = state.history.filter((i) => i.id !== item.id);
      state.selectedItems.delete(item.id);
      saveAndRender();
      totalOfCalculationsChecked();

      if (state.history?.length === 0 && state.checkedAll) {
        state.checkedAll = false;
        elements.unselect.innerHTML = `<i class="fa-solid fa-square-check"></i> SelectAll`;
      }
    });

    elements.historyList.appendChild(li);
  });
}

/* ===================== BUTTON ===================== */

elements.showAllBtn.onclick = () => {
  if (!state.history.length) {
    elements.notification.innerText = "Không có lịch sử";
    setTimeout(() => (elements.notification.innerText = ""), 2000);
    return;
  }
  state.showAll = !state.showAll;
  elements.showAllBtn.innerHTML = state.showAll
    ? `Hidden <i class="fa-solid fa-arrows-up-to-line"></i>`
    : `Show All <i class="fa-solid fa-arrow-down-short-wide"></i>`;
  renderHistory();
};

// elements.sumBtn.onclick = () => {
//   if (state.selectedItems.size === 0) {
//     return Swal.fire({
//       position: "center",
//       icon: "error",
//       title: "Chọn ít nhất một mục!",
//       showConfirmButton: false,
//       timer: 1500,
//     });
//   }

//   const selectedValues = Array.from(state.selectedItems)
//     .map((id) => state.history.find((h) => h.id === id))
//     .filter(Boolean);

//   const total = selectedValues.reduce(
//     (acc, curr) => acc + Number(curr.value),
//     0,
//   );

//   elements.checkedResult.value = Formatter.formatNumber(total);
//   state.justCalculated = true;
// };

elements.clearBtn.onclick = () => {
  if (state.history.length === 0) {
    return Swal.fire({
      position: "center",
      icon: "error",
      title: "Không có lịch sử!",
      showConfirmButton: false,
      timer: 1500,
    });
  }
  Swal.fire({
    title: "Bạn có chắc muốn xóa?",
    text: "Bạn sẽ không thể hoàn tác điều này!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#00a6f4",
    cancelButtonColor: "#d33",
    confirmButtonText: "Vâng, xóa nó đi!",
    cancelButtonText: "Thôi! đừng xóa.",
  }).then((result) => {
    if (result.isConfirmed) {
      state.history = [];
      state.selectedItems.clear();
      elements.checkedResult.value = "0";
      localStorage.removeItem("historyCalculator");
      state.checkedAll = false;
      elements.unselect.innerHTML = `<i class="fa-solid fa-square-check"></i> SelectAll`;
      renderHistory();
    }
  });
};

elements.unselect.onclick = () => {
  state.checkedAll = !state.checkedAll;

  state.checkedAll
    ? (elements.unselect.innerHTML = `<i class="fa-solid fa-square-check"></i> Unselect`)
    : (elements.unselect.innerHTML = `<i class="fa-solid fa-square-check"></i> SelectAll`);

  elements.historyList.querySelectorAll("input").forEach((i) => {
    i.checked = state.checkedAll;
  });

  state.history.map((i) => (i.isChecked = state.checkedAll));

  totalOfCalculationsChecked();
};

elements.historyBtn.addEventListener("click", () => {
  state.showHistory = !state.showHistory;

  if (state.showHistory) {
    document.getElementById("container-history").style.display = "block";
    elements.checkedResult.value = "0";
  } else {
    document.getElementById("container-history").style.display = "none";
  }
});

elements.backCalculate.addEventListener("click", () => {
  state.showHistory = false;
  document.getElementById("container-history").style.display = "none";
});

renderHistory();

/* ===================== KEYBOARD ===================== */

document.addEventListener("keydown", (e) => {
  if (!isNaN(e.key)) addToNumber(e.key);
  if ("+-*/".includes(e.key)) addToResult(e.key);
  if (e.key === "." || e.key === ",") addToNumber(".");
  if (e.key === "%") percent();
  if (e.key === "Enter") calculate();
  if (e.key === "Backspace") backspace();
  if (e.key === "Escape") clearResult();
});

/* ===================== PWA ===================== */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
