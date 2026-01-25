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

/* ===================== FORMAT ===================== */

// format số để HIỂN THỊ (1.234,56)
function formatNumber(numStr) {
  let [int, dec] = numStr.split(".");
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec !== undefined ? `${int},${dec}` : int;
}

// chuyển hiển thị -> nội bộ JS
function displayToRaw(str) {
  return str.replace(/\./g, "").replace(/,/g, ".");
}

// render lại toàn bộ biểu thức
function renderExpression(raw) {
  return raw.replace(/\d+(\.\d+)?/g, (m) => formatNumber(m));
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

  let raw = displayToRaw(result.value);

  // ❗ chặn nhiều dấu thập phân trong cùng 1 số
  let lastNumber = raw.split(/[+\-*/()]/).pop();
  if (n === "." && lastNumber.includes(".")) return;

  raw += n;
  result.value = renderExpression(raw);
  autoCalculate();
}

function addToResult(op) {
  let raw = displayToRaw(result.value);
  if (!raw) return;
  if (/[+\-*/.]$/.test(raw)) return;

  result.value = renderExpression(raw + op);
  justCalculated = false;
}

/* ===================== CONTROL ===================== */

function clearResult() {
  result.value = "";
  calcul.value = "0";
  justCalculated = false;
}

function backspace() {
  let raw = displayToRaw(result.value).slice(0, -1);
  result.value = renderExpression(raw);
  autoCalculate();
}

function calculate() {
  const raw = displayToRaw(result.value);
  if (!isValidExpression(raw)) return;

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

/* ===================== HISTORY ===================== */

function updateHistory(item) {
  history.unshift(item);
  if (history.length > 15) history.pop();
  localStorage.setItem("historyCalculator", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";
  const list = showAll ? history : history.slice(0, 5);

  list.forEach((i) => {
    const li = document.createElement("li");
    li.textContent = i;
    li.className = "history-item";
    li.onclick = () => recall(i);
    historyList.appendChild(li);
  });
}

function recall(text) {
  const [exp, res] = text.split(" = ");
  result.value = exp;
  calcul.value = res;
}

/* ===================== BUTTON ===================== */

showAllBtn.onclick = () => {
  if (!history.length) {
    notification.innerText = "Không có lịch sử";
    setTimeout(() => (notification.innerText = ""), 2000);
    return;
  }
  showAll = !showAll;
  showAllBtn.innerText = showAll ? "Hidden" : "Show All";
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
  if (e.key === "(" || e.key === ")") addToResult(e.key);
  if (e.key === "Enter") calculate();
  if (e.key === "Backspace") backspace();
  if (e.key === "Escape") clearResult();
});

/* ===================== PWA ===================== */

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
