let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let goal = Number(localStorage.getItem("goal")) || 0;

let chart, categoryChart, lineChart, predictionChart;

window.onload = function () {

  chart = new Chart(document.getElementById("chart"), {
    type: "doughnut",
    data: { labels: ["Income","Expense"], datasets:[{data:[0,0]}] }
  });

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: { labels: [], datasets:[{data:[]}] }
  });

  lineChart = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: { labels: [], datasets:[{data:[]}] }
  });

  predictionChart = new Chart(document.getElementById("predictionChart"), {
    type: "line",
    data: { labels: [], datasets:[{data:[]}] }
  });

  updateUI(); // load saved data
};

let savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light-mode");
  document.getElementById("themeBtn").innerText = "☀️";
}
// SAVE DATA
function saveData() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("goal", goal);
}

// LOGIN
function login() {
  let name = document.getElementById("username").value;
  if (!name) return alert("Enter name");

  document.getElementById("loginPage").style.display = "none";
  document.querySelector(".app").style.display = "block";

  document.getElementById("welcome").innerText = "Welcome, " + name;
}

// ADD TRANSACTION
function addTransaction() {
  let desc = document.getElementById("desc").value;
  let amount = Number(document.getElementById("amount").value);
  let type = document.getElementById("type").value;
  let category = document.getElementById("category").value;

  if (!desc || !amount) return alert("Fill all fields");

  transactions.push({
    desc, amount, type, category,
    date: new Date().toLocaleDateString()
  });

  saveData();
  updateUI();
}

// DELETE TRANSACTION
function deleteTransaction(index) {
  transactions.splice(index, 1);
  saveData();
  updateUI();
}

// UPDATE UI
function updateUI() {
  let income=0, expense=0, categories={};

  transactions.forEach(t=>{
    if(t.type==="income") income+=t.amount;
    else {
      expense+=t.amount;
      categories[t.category]=(categories[t.category]||0)+t.amount;
    }
  });

  let balance = income - expense;

  document.getElementById("balance").innerText = balance;

  let score = income ? Math.max(0, 100 - (expense/income)*100) : 0;
  document.getElementById("score").innerText = score.toFixed(0);

  document.getElementById("monthly").innerText =
    `Income ₹${income} | Expense ₹${expense}`;

  // RISK
  let risk = income ? Math.min((expense/income)*100,100) : 100;
  document.getElementById("risk").innerText = risk.toFixed(0);

  // ✅ PROFIT % FIXED
  let profit = income ? ((balance / income) * 100) : 0;
  let profitEl = document.getElementById("profit");
  if (profitEl) {
    profitEl.innerText = profit.toFixed(1);
  }

  chart.data.datasets[0].data=[income,expense];
  chart.update();

  categoryChart.data.labels=Object.keys(categories);
  categoryChart.data.datasets[0].data=Object.values(categories);
  categoryChart.update();

  lineChart.data.labels = transactions.map((_,i)=>i+1);
  lineChart.data.datasets[0].data =
    transactions.map(t => t.type==="income"?t.amount:-t.amount);
  lineChart.update();

  generatePrediction(balance);
  updateGoal(balance);
  updateHistory();
}

// PREDICTION
function generatePrediction(balance) {
  let future = [];

  for (let i=1; i<=5; i++) {
    future.push(balance + i * (Math.random()*500));
  }

  predictionChart.data.labels = ["Now","1M","2M","3M","4M","5M"];
  predictionChart.data.datasets[0].data = [balance, ...future];
  predictionChart.update();
}

// SET GOAL
function setGoal() {
  goal = Number(document.getElementById("goalInput").value);

  if (!goal) {
    document.getElementById("goalStatus").innerText = "⚠️ Enter valid goal";
    return;
  }

  saveData();

  let balance = Number(document.getElementById("balance").innerText);

  document.getElementById("goalStatus").innerText = "✅ Your goal is set";

  setTimeout(() => {
    updateGoal(balance);
  }, 1000);
}

// UPDATE GOAL
function updateGoal(balance) {
  if (!goal) return;

  let progress = Math.min((balance / goal) * 100, 100);
  document.getElementById("progressBar").style.width = progress + "%";

  let msg = "";

  if (balance >= goal) {
    msg = "🎉 Goal Achieved!";
  } else if (balance <= 0) {
    msg = "⚠️ No savings yet";
  } else {
    msg = `💡 You need ₹${goal - balance} more`;
  }

  document.getElementById("goalStatus").innerText = msg;
}

// HISTORY
function updateHistory() {
  let historyDiv = document.getElementById("history");

  if (!historyDiv) return;

  if (transactions.length === 0) {
    historyDiv.innerHTML = "<p>No transactions</p>";
    return;
  }

  historyDiv.innerHTML = "";

  transactions.forEach((t, index) => {
    let color = t.type === "income" ? "lightgreen" : "salmon";

    historyDiv.innerHTML += `
      <p style="color:${color}">
        ${t.date} - ${t.desc} ₹${t.amount} (${t.category})
        <button onclick="deleteTransaction(${index})">❌</button>
      </p>
    `;
  });
}
function openHistoryPage() {
  window.open("history.html", "_blank");
}

// AI (UNCHANGED)
function askAI() {
  let chat = document.getElementById("chatBox");

  let income = chart.data.datasets[0].data[0];
  let expense = chart.data.datasets[0].data[1];

  let reply = expense > income
    ? "🔴 Overspending!"
    : expense > income*0.7
    ? "🟡 Control spending"
    : "🟢 Good financial health";

  chat.innerHTML += `<p>🤖 ${reply}</p>`;
}

// VOICE (UNCHANGED)
async function startVoice() {
  const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  rec.start();

  rec.onresult = async function(e) {
    let userText = e.results[0][0].transcript;

    let chat = document.getElementById("chatBox");
    chat.innerHTML += `<p>🧑 ${userText}</p>`;

    let aiReply = await getAIResponse(userText);

    chat.innerHTML += `<p>🤖 ${aiReply}</p>`;

    speak(aiReply);
  };
}

// 🔥 AI RESPONSE (OPENAI)
async function getAIResponse(message) {
  try {
    let response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a smart financial assistant." },
          { role: "user", content: message }
        ]
      })
    });

    let data = await response.json();

    return data.choices[0].message.content;

  } catch (err) {
    return "⚠️ AI not connected. Check API key.";
  }
}

// 🔊 SPEAK
function speak(text) {
  let s = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(s);
}
function toggleTheme() {
  document.body.classList.toggle("light-mode");

  let btn = document.getElementById("themeBtn");

  if (document.body.classList.contains("light-mode")) {
    btn.innerText = "☀️";
    localStorage.setItem("theme", "light");
  } else {
    btn.innerText = "🌙";
    localStorage.setItem("theme", "dark");
  }
}
function openAchievements() {
  window.open("achievements.html", "_blank");
}
