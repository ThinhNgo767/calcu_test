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

function autoCalculate(expression) {
  try {
    let raw = Formatter.displayToRaw(expression);

    // Nếu biểu thức kết thúc bằng toán tử (+, -, *, /),
    // ta tạm thời cắt bỏ nó để tính toán phần số đã nhập phía trước.
    if (/[+\-*/.]$/.test(raw)) {
      raw = raw.slice(0, -1);
    }

    if (!raw) return null;

    const res = new Function(`"use strict"; return (${raw})`)();
    if (isNaN(res) || !isFinite(res)) return null;

    return Number(Math.round(res + "e10") + "e-10");
  } catch (e) {
    return null;
  }
}

/* ===================== INPUT ===================== */

function addToNumber(n) {
  if (state.justCalculated) {
    elements.result.value = "";
    elements.calcul.value = "0";
    state.justCalculated = false;
  }

  // 1️⃣ lấy raw
  let currentRaw = Formatter.displayToRaw(elements.result.value);

  // 2️⃣ số cuối cùng
  let lastNumber = currentRaw.split(/[+\-*/()]/).pop();

  // 3️⃣ chặn nhiều dấu thập phân
  if (n === "." && lastNumber.includes(".")) return;

  // 4️⃣ thêm vào raw
  const newRaw = currentRaw + n;

  // 5️⃣ render lại UI
  elements.result.value = Formatter.renderExpression(newRaw);

  // 6️⃣ auto calc
  const autoRes = autoCalculate(elements.result.value);
  if (autoRes !== null) {
    elements.calcul.value = Formatter.formatNumber(autoRes);
  }
}

function addToResult(op) {
  if (!elements.result.value) return;

  // Tránh nhập liên tiếp dấu toán tử hoặc dấu % rồi đến toán tử
  if (/[+×÷\-]$/.test(elements.result.value)) {
    // Nếu bấm toán tử khác khi đã có toán tử, thì thay thế toán tử cũ
    elements.result.value = elements.result.value.slice(0, -1);
  }

  const map = { "*": "×", "/": "÷" };
  elements.result.value += map[op] || op;
  state.justCalculated = false;

  // Lấy kết quả tạm tính trước đó để hiển thị trong khi chờ số tiếp theo
  const currentRaw = Formatter.displayToRaw(elements.result.value.slice(0, -1));
  const tempRes = autoCalculate(currentRaw);
  if (tempRes !== null) {
    elements.calcul.value = Formatter.formatNumber(tempRes);
  }
}

/* ===================== +/- FIX ===================== */

function toggleSign() {
  const exp = elements.result.value;
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

  elements.result.value = before + number;

  // Cập nhật kết quả tính toán ngay lập tức
  const res = autoCalculate(elements.result.value);
  if (res !== null) {
    elements.calcul.value = Formatter.formatNumber(res);
  }
}

function percent() {
  const exp = elements.result.value;
  if (!exp || /%$/.test(exp)) return; // Nếu đã có % ở cuối thì không cho thêm nữa

  // Sửa Regex để bắt được cả số nằm trong ngoặc (số âm)
  const match = exp.match(/(.*?)(\(?\d+([.,]\d+)?\)?)$/);
  if (!match) return;

  elements.result.value = match[1] + match[2] + "%";

  const autoRes = autoCalculate(elements.result.value);
  if (autoRes !== null) {
    elements.calcul.value = Formatter.formatNumber(autoRes);
  }
}

/* ===================== CONTROL ===================== */

function clearResult() {
  elements.result.value = "";
  elements.calcul.value = "0";
  state.justCalculated = false;
}

function backspace() {
  elements.result.value = elements.result.value.slice(0, -1);

  if (elements.result.value.length === 0) {
    elements.calcul.value = "0";
    return;
  }

  autoCalculate(elements.result.value);
}

function calculate() {
  const res = autoCalculate(elements.result.value);
  if (res === null) return;

  const formattedRes = Formatter.formatNumber(res);
  const historyEntry = `${elements.result.value} = ${formattedRes}`;

  if (state.isEditing) {
    const idx = state.history.findIndex((item) => item.id === state.editId);
    if (idx !== -1) {
      state.history[idx].text = historyEntry;
      state.history[idx].value = res;
    }
    state.isEditing = false;
    state.editId = null;
  } else {
    state.history.unshift({ id: Date.now(), text: historyEntry, value: res });
    if (state.history.length > 15) state.history.pop();
  }

  elements.calcul.value = formattedRes;
  state.justCalculated = true;
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem("historyCalculator", JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  const itemsToShow = state.showAll ? state.history : state.history.slice(0, 5);

  itemsToShow.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const isChecked = state.selectedItems.has(item.id);

    li.innerHTML = `
      <input type="checkbox" ${isChecked ? "checked" : ""} data-id="${item.id}">
      <span class="history-text">${item.text}</span>
      <button class="delete-btn" id ="delete-item">Xóa</button>
    `;

    // Sự kiện checkbox
    li.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) state.selectedItems.add(item.id);
      else state.selectedItems.delete(item.id);
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
      elements.result.value = exp;
      elements.calcul.value = res;
      state.isEditing = true;
      state.editId = item.id;
      state.justCalculated = false;
    });
    li.addEventListener("touchstart", () => {
      state.pressTimer = setTimeout(() => {
        const [exp, res] = item.text.split(" = ");
        elements.result.value = exp;
        elements.calcul.value = res;
        state.isEditing = true;
        state.editId = item.id;
        state.justCalculated = false;
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
  elements.showAllBtn.innerText = state.showAll ? "Hidden" : "Show All";
  renderHistory();
};

elements.sumBtn.onclick = () => {
  if (state.selectedItems.size === 0) {
    return Swal.fire({
      position: "center",
      icon: "error",
      title: "Chọn ít nhất một mục!",
      showConfirmButton: false,
      timer: 1500,
    });
  }

  const selectedValues = Array.from(state.selectedItems)
    .map((id) => state.history.find((h) => h.id === id))
    .filter(Boolean);

  const total = selectedValues.reduce((acc, curr) => acc + curr.value, 0);

  elements.result.value = "Tổng đã chọn";
  elements.calcul.value = Formatter.formatNumber(total);
  state.justCalculated = true;
};

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
      localStorage.removeItem("historyCalculator");
      clearResult();
      renderHistory();
    }
  });
};

elements.unselect.onclick = () => {
  elements.historyList.querySelectorAll("input").forEach((i) => {
    i.checked = false;
  });
  state.selectedItems.clear();
};

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
