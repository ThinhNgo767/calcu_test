/* ===================== ELEMENT ===================== */

const result = document.getElementById("result");
const calcul = document.getElementById("calcul");
const historyList = document.getElementById("historyList");
const showAllBtn = document.getElementById("full-history");
const clearBtn = document.getElementById("clear-history");
const notification = document.getElementById("notification");

/* ===================== STATE ===================== */

let history = JSON.parse(localStorage.getItem("historyCalculator")) || [];
let showAll = false;
let justCalculated = false;
let editOperation = false;
let indexHistory = null;

/* ===================== FORMAT ===================== */

function formatNumber(numStr) {
  let [int, dec] = numStr.split(".");
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec !== undefined ? `${int},${dec}` : int;
}

function displayToRaw(str) {
  return str
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/(\d+(\.\d+)?)%/g, "($1/100)");
}

function renderExpression(raw) {
  return raw
    .replace(/\d+(\.\d+)?/g, (m) => formatNumber(m))
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");
}

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

function autoCalculate() {
  const raw = displayToRaw(result.value);

  if (!isValidExpression(raw)) return;

  try {
    const res = Function(`"use strict"; return (${raw})`)();
    const final = Number(Math.round(res + "e10") + "e-10");

    calcul.value = formatNumber(final.toString());
  } catch {}
}

/* ===================== INPUT ===================== */

function addToNumber(n) {
  if (justCalculated) {
    result.value = "";
    calcul.value = "0";
    justCalculated = false;
  }

  // 1️⃣ lấy raw
  let raw = displayToRaw(result.value);

  // 2️⃣ số cuối cùng
  let lastNumber = raw.split(/[+\-*/()]/).pop();

  // 3️⃣ chặn nhiều dấu thập phân
  if (n === "." && lastNumber.includes(".")) return;

  // 4️⃣ thêm vào raw
  raw += n;

  // 5️⃣ render lại UI

  result.value = renderExpression(raw);

  // 6️⃣ auto calc
  autoCalculate();
}

function addToResult(op) {
  if (!result.value) return;
  if (/[+\-×:%]$/.test(result.value)) return;

  const map = {
    "*": "×",
    "/": "÷",
  };

  result.value += map[op] || op;
  justCalculated = false;
}

/* ===================== +/- FIX ===================== */

function toggleSign() {
  let exp = result.value;
  if (!exp) return;

  let match = exp.match(/(.*?)(-?\(?\d+([.,]\d+)?\)?%?)$/);
  if (!match) return;

  let before = match[1];
  let number = match[2];

  if (number.startsWith("-(") && number.endsWith(")")) {
    number = number.slice(2, -1);
  } else {
    number = `-(${number})`;
  }

  result.value = before + number;
  autoCalculate();
}

/* ===================== % FIX ===================== */

function percent() {
  if (!result.value) return;

  let match = result.value.match(/(.*?)(\d+([.,]\d+)?)$/);
  if (!match) return;

  result.value = match[1] + match[2] + "%";
  autoCalculate();
}

/* ===================== CONTROL ===================== */

function clearResult() {
  result.value = "";
  calcul.value = "0";
  justCalculated = false;
}

function backspace() {
  result.value = result.value.slice(0, -1);

  if (result.value.length === 0) {
    calcul.value = "0";
    return;
  }

  autoCalculate();
}

function calculate() {
  const raw = displayToRaw(result.value);
  if (!isValidExpression(raw)) return;

  if (editOperation) {
    try {
      const res = Function(`"use strict"; return (${raw})`)();
      const final = Number(Math.round(res + "e10") + "e-10");

      calcul.value = formatNumber(final.toString());
      updateOperationHistory(`${result.value} = ${calcul.value}`);
      justCalculated = true;
      editOperation = false;
      indexHistory = null;
    } catch {
      calcul.value = "Lỗi";
    }
  } else {
    try {
      const res = Function(`"use strict"; return (${raw})`)();
      const final = Number(Math.round(res + "e10") + "e-10");

      calcul.value = formatNumber(final.toString());
      updateHistory(`${result.value} = ${calcul.value}`);
      justCalculated = true;
    } catch {
      calcul.value = "Lỗi";
    }
  }
}

/* ===================== HISTORY ===================== */

function updateHistory(item) {
  history.unshift(item);
  if (history.length > 15) history.pop();
  localStorage.setItem("historyCalculator", JSON.stringify(history));
  renderHistory();
}

function updateOperationHistory(item) {
  history[indexHistory] = item;
  localStorage.setItem("historyCalculator", JSON.stringify(history));
  renderHistory();
}

function recall(text) {
  const [exp, res] = text.split(" = ");
  result.value = exp;
  calcul.value = res;
}

function renderHistory() {
  historyList.innerHTML = "";
  const list = showAll ? history : history.slice(0, 5);

  list.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.className = "history-item";

    /* ========== CLICK (highlight) ========== */
    li.addEventListener("click", () => {
      document
        .querySelectorAll(".history-item.high-light")
        .forEach((el) => el.classList.remove("high-light"));

      li.classList.add("high-light");
    });

    /* ========== DESKTOP: DOUBLE CLICK ========== */
    li.addEventListener("dblclick", () => {
      recall(item);
      li.classList.remove("high-light");
      justCalculated = false;
      editOperation = true;
      indexHistory = index;
    });

    /* ========== MOBILE: LONG PRESS ========== */
    let pressTimer = null;

    li.addEventListener("touchstart", () => {
      pressTimer = setTimeout(() => {
        recall(item);
        li.classList.remove("high-light");
        justCalculated = false;
        editOperation = true;
        indexHistory = index;
      }, 600); // 600ms = long press
    });

    li.addEventListener("touchend", () => {
      clearTimeout(pressTimer);
    });

    li.addEventListener("touchmove", () => {
      clearTimeout(pressTimer);
    });

    historyList.appendChild(li);
  });
}

/* ===================== BUTTON ===================== */

showAllBtn.onclick = () => {
  if (!history.length) {
    notification.innerText = "Không có lịch sử";
    setTimeout(() => (notification.innerText = ""), 2000);
    return;
  }
  showAll = !showAll;
  showAllBtn.innerText = showAll ? "Ẩn bớt" : "Xem tất cả";
  renderHistory();
};

clearBtn.onclick = () => {
  if (!confirm("Xóa toàn bộ lịch sử?")) return;
  history = [];
  localStorage.removeItem("historyCalculator");
  clearResult();
  renderHistory();
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
