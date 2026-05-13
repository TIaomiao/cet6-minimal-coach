const STORAGE_KEY = "cet6MinimalCoachRecords";
const EXAM_DATE = new Date(2026, 5, 13, 15, 0, 0);

const listeningReasonOptions = [
  "没听懂",
  "没定位",
  "同义替换没识别",
  "被干扰项骗了",
  "发音问题"
];

const expressionIssueOptions = [
  "下不了笔",
  "中式英语",
  "搭配错误",
  "主谓不一致",
  "单复数误用",
  "时态错误",
  "冠词/介词错误",
  "从句结构错误",
  "句子成分缺失",
  "逻辑混乱"
];

const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const expressionPlans = {
  writing: {
    label: "写作",
    title: "写作 15 分钟",
    detail: "写一小段六级作文 -> 对照范文 -> 留下 2 个可复用表达"
  },
  translation: {
    label: "翻译",
    title: "翻译 15 分钟",
    detail: "翻译一小段中文材料 -> 对照译文 -> 圈出搭配和语法问题"
  },
  review: {
    label: "表达复盘",
    title: "复盘表达 15 分钟",
    detail: "回看本周问题 -> 重写 3 句表达 -> 明确下周最小动作"
  }
};

const elements = {
  todayText: document.querySelector("#todayText"),
  countdownText: document.querySelector("#countdownText"),
  streakText: document.querySelector("#streakText"),
  expressionTaskTitle: document.querySelector("#expressionTaskTitle"),
  expressionTaskDetail: document.querySelector("#expressionTaskDetail"),
  expressionIssuesTitle: document.querySelector("#expressionIssuesTitle"),
  listeningReasons: document.querySelector("#listeningReasons"),
  expressionIssues: document.querySelector("#expressionIssues"),
  summaryInput: document.querySelector("#summaryInput"),
  tomorrowInput: document.querySelector("#tomorrowInput"),
  gptFeedbackInput: document.querySelector("#gptFeedbackInput"),
  saveStatus: document.querySelector("#saveStatus"),
  recentDays: document.querySelector("#recentDays"),
  commonIssues: document.querySelector("#commonIssues"),
  adviceBox: document.querySelector("#adviceBox"),
  generateAdviceButton: document.querySelector("#generateAdviceButton"),
  importGptButton: document.querySelector("#importGptButton"),
  copyPromptButton: document.querySelector("#copyPromptButton"),
  copyTodayButton: document.querySelector("#copyTodayButton"),
  fillSampleButton: document.querySelector("#fillSampleButton"),
  clearButton: document.querySelector("#clearButton")
};

const today = new Date();
const todayKey = formatDateKey(today);
let records = normalizeRecords(loadRecords());
let currentRecord = records[todayKey] || createEmptyRecord(today);

renderPage();
bindEvents();

function bindEvents() {
  document.querySelectorAll("[data-task]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      currentRecord.tasks[checkbox.dataset.task] = checkbox.checked;
      saveCurrentRecord();
    });
  });

  elements.summaryInput.addEventListener("input", () => {
    currentRecord.summary = elements.summaryInput.value.trim();
    saveCurrentRecord();
  });

  elements.tomorrowInput.addEventListener("input", () => {
    currentRecord.tomorrowFocus = elements.tomorrowInput.value.trim();
    saveCurrentRecord();
  });

  elements.gptFeedbackInput.addEventListener("input", () => {
    currentRecord.gptFeedback = elements.gptFeedbackInput.value.trim();
    saveCurrentRecord();
  });

  elements.generateAdviceButton.addEventListener("click", () => {
    renderAdvice(generateAdvice());
  });

  elements.importGptButton.addEventListener("click", importGptRecord);
  elements.copyPromptButton.addEventListener("click", copyGptPrompt);
  elements.copyTodayButton.addEventListener("click", copyTodayRecord);
  elements.fillSampleButton.addEventListener("click", fillSampleData);
  elements.clearButton.addEventListener("click", clearAllRecords);
}

function renderPage() {
  const expressionPlan = getExpressionPlan(today);
  currentRecord.expressionType = expressionPlan.label;

  elements.todayText.textContent = `${formatDisplayDate(today)} ${weekdayNames[today.getDay()]}`;
  elements.countdownText.textContent = getCountdownText();
  elements.expressionTaskTitle.textContent = expressionPlan.title;
  elements.expressionTaskDetail.textContent = expressionPlan.detail;
  elements.expressionIssuesTitle.textContent = `${expressionPlan.label}问题`;

  renderChoices(elements.listeningReasons, listeningReasonOptions, currentRecord.listeningReasons, "listening");
  renderChoices(elements.expressionIssues, expressionIssueOptions, currentRecord.expressionIssues, "expression");
  renderCurrentRecord();
  renderStats();
}

function renderCurrentRecord() {
  document.querySelector('[data-task="listening"]').checked = currentRecord.tasks.listening;
  document.querySelector('[data-task="expression"]').checked = currentRecord.tasks.expression;
  document.querySelector('[data-task="reflection"]').checked = currentRecord.tasks.reflection;
  elements.summaryInput.value = currentRecord.summary;
  elements.tomorrowInput.value = currentRecord.tomorrowFocus;
  elements.gptFeedbackInput.value = currentRecord.gptFeedback || "";
}

function renderChoices(container, options, selectedValues, type) {
  container.innerHTML = "";

  options.forEach((option) => {
    const chip = document.createElement("label");
    chip.className = "chip";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = option;
    checkbox.checked = selectedValues.includes(option);
    checkbox.addEventListener("change", () => {
      const targetList = type === "listening"
        ? currentRecord.listeningReasons
        : currentRecord.expressionIssues;

      updateSelectedList(targetList, option, checkbox.checked);
      saveCurrentRecord();
    });

    const text = document.createElement("span");
    text.textContent = option;

    chip.append(checkbox, text);
    container.appendChild(chip);
  });
}

function renderStats() {
  elements.streakText.textContent = `${calculateStreak()} 天`;
  renderRecentDays();
  renderCommonIssues();
}

function renderRecentDays() {
  elements.recentDays.innerHTML = "";

  getRecentDateKeys(7).forEach((dateKey) => {
    const record = records[dateKey];
    const completedCount = record ? countCompletedTasks(record) : 0;
    const fillPercent = (completedCount / 3) * 100;

    const row = document.createElement("div");
    row.className = "day-row";

    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = formatShortDate(dateKey);

    const bar = document.createElement("span");
    bar.className = "day-bar";

    const fill = document.createElement("span");
    fill.className = `day-fill ${completedCount === 0 ? "empty" : completedCount < 3 ? "partial" : ""}`;
    fill.style.width = `${fillPercent}%`;

    const score = document.createElement("span");
    score.className = "day-score";
    score.textContent = `${completedCount}/3`;

    bar.appendChild(fill);
    row.append(label, bar, score);
    elements.recentDays.appendChild(row);
  });
}

function renderCommonIssues() {
  elements.commonIssues.innerHTML = "";
  const commonIssues = getTopIssuesForCurrentWeek();

  if (commonIssues.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "本周还没有问题记录。";
    elements.commonIssues.appendChild(empty);
    return;
  }

  commonIssues.forEach(([issue, count]) => {
    const item = document.createElement("li");
    item.textContent = `${issue}：${count} 次`;
    elements.commonIssues.appendChild(item);
  });
}

function renderAdvice(adviceItems) {
  const list = document.createElement("ul");

  adviceItems.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    list.appendChild(listItem);
  });

  elements.adviceBox.innerHTML = "";
  elements.adviceBox.appendChild(list);
}

function saveCurrentRecord() {
  currentRecord.updatedAt = new Date().toISOString();
  records[todayKey] = currentRecord;
  saveRecords(records);
  renderStats();
  showSavedStatus("已自动保存");
}

function showSavedStatus(message) {
  const time = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
  elements.saveStatus.textContent = `${message} ${time}`;
}

function importGptRecord() {
  const rawText = elements.gptFeedbackInput.value.trim();

  if (!rawText) {
    elements.saveStatus.textContent = "先粘贴 GPT 反馈或 JSON。";
    return;
  }

  const parsedRecord = tryParseJsonFromText(rawText);

  if (!parsedRecord) {
    currentRecord.gptFeedback = rawText;
    currentRecord.summary = currentRecord.summary || rawText.slice(0, 180);
    saveCurrentRecord();
    renderPage();
    elements.saveStatus.textContent = "未识别 JSON，已保存为 GPT 反馈原文。";
    return;
  }

  applyImportedRecord(parsedRecord, rawText);
  saveCurrentRecord();
  renderPage();
  elements.saveStatus.textContent = "已导入 GPT 记录。";
}

function tryParseJsonFromText(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (_) {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(rawText.slice(start, end + 1));
    } catch (error) {
      return null;
    }
  }
}

function applyImportedRecord(importedRecord, rawText) {
  if (importedRecord.tasks && typeof importedRecord.tasks === "object") {
    ["listening", "expression", "reflection"].forEach((taskName) => {
      if (typeof importedRecord.tasks[taskName] === "boolean") {
        currentRecord.tasks[taskName] = importedRecord.tasks[taskName];
      }
    });
  }

  currentRecord.listeningReasons = sanitizeIssueList(importedRecord.listeningReasons, listeningReasonOptions);
  currentRecord.expressionIssues = sanitizeIssueList(importedRecord.expressionIssues, expressionIssueOptions);
  currentRecord.summary = String(importedRecord.summary || currentRecord.summary || "").trim();
  currentRecord.tomorrowFocus = String(importedRecord.tomorrowFocus || currentRecord.tomorrowFocus || "").trim();
  currentRecord.gptFeedback = String(importedRecord.gptFeedback || rawText).trim();
}

function sanitizeIssueList(value, allowedOptions) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter((item) => allowedOptions.includes(item));
}

function copyGptPrompt() {
  const prompt = [
    "请根据刚才的六级训练反馈，输出 CET-6 Minimal Coach 可导入 JSON。",
    "只输出 JSON，不要解释，不要 Markdown 代码块。",
    "可选听力错因：没听懂 / 没定位 / 同义替换没识别 / 被干扰项骗了 / 发音问题。",
    "可选表达问题：下不了笔 / 中式英语 / 搭配错误 / 主谓不一致 / 单复数误用 / 时态错误 / 冠词/介词错误 / 从句结构错误 / 句子成分缺失 / 逻辑混乱。",
    "JSON 格式如下：",
    JSON.stringify({
      tasks: {
        listening: true,
        expression: true,
        reflection: true
      },
      listeningReasons: ["没定位"],
      expressionIssues: ["主谓不一致", "单复数误用"],
      summary: "今天完成了什么，错在哪里。",
      tomorrowFocus: "明天最该注意的一件事。",
      gptFeedback: "保留 GPT 对我的关键反馈。"
    }, null, 2)
  ].join("\n");

  copyText(prompt, "已复制 GPT 模板。");
}

function copyTodayRecord() {
  copyText(JSON.stringify(currentRecord, null, 2), "已复制今日 JSON。");
}

function copyText(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        elements.saveStatus.textContent = successMessage;
      })
      .catch(() => {
        fallbackCopyText(text, successMessage);
      });
    return;
  }

  fallbackCopyText(text, successMessage);
}

function fallbackCopyText(text, successMessage) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  document.body.removeChild(helper);
  elements.saveStatus.textContent = successMessage;
}

function generateAdvice() {
  const recentRecords = getRecentDateKeys(7)
    .map((dateKey) => records[dateKey])
    .filter(Boolean);

  if (recentRecords.length === 0) {
    return [
      "先完成今天的最小闭环：听力一小段、表达一小段、打卡三分钟。",
      "不要补旧账，今天只记录一个真实问题。"
    ];
  }

  const completedTasks = recentRecords.reduce((sum, record) => sum + countCompletedTasks(record), 0);
  const completionRate = completedTasks / (7 * 3);
  const advice = [];

  if (completionRate < 0.35) {
    advice.push("今天不要加量，先保住听力 20 分钟和 3 分钟打卡。");
  } else if (completionRate < 0.7) {
    advice.push("节奏已经启动，今天把未完成项压到 1 个以内。");
  } else {
    advice.push("完成率不错，别临时加重计划，保持 35-45 分钟到考试前。");
  }

  const topListeningIssue = getTopIssueFromRecords(recentRecords, "listeningReasons");
  const topExpressionIssue = getTopIssueFromRecords(recentRecords, "expressionIssues");

  if (topListeningIssue) {
    advice.push(getListeningAdvice(topListeningIssue));
  }

  if (topExpressionIssue) {
    advice.push(getExpressionAdvice(topExpressionIssue));
  }

  if (advice.length === 1) {
    advice.push("今天至少写下一个错因，明天才知道该怎么调整。");
  }

  return advice.slice(0, 3);
}

function getListeningAdvice(issue) {
  const adviceMap = {
    "没听懂": "听力只精听 3 句答案句，别整篇硬啃。",
    "没定位": "听力先圈题干关键词，再找答案句的位置。",
    "同义替换没识别": "今天记录 2 组同义替换，做成自己的小词库。",
    "被干扰项骗了": "对答案时写一句：这个干扰项为什么像正确答案。",
    "发音问题": "跟读答案句 3 遍，重点听连读和弱读。"
  };

  return adviceMap[issue] || "听力今天只抓一个错因，练完就收。";
}

function getExpressionAdvice(issue) {
  const adviceMap = {
    "下不了笔": "表达题先写中文提纲，再写最简单的英文句。",
    "中式英语": "今天只改 3 句，把直译句改成更自然的英文表达。",
    "搭配错误": "从范文里抄 3 个可复用搭配，不贪多。",
    "主谓不一致": "翻译后先圈主语和谓语，确认人称和数一致。",
    "单复数误用": "今天只检查可数名词有没有漏复数、泛指有没有误加复数。",
    "时态错误": "先判断句子说的是过去、现在还是一般事实，再统一时态。",
    "冠词/介词错误": "把常错冠词和介词搭配抄 3 个例句，明天复用。",
    "从句结构错误": "今天少写长句，先保证从句连接词和主句结构完整。",
    "句子成分缺失": "每句先找主语、谓语、宾语或表语，缺一个就先补齐。",
    "逻辑混乱": "先写清 because、however、for example 三类关系。"
  };

  return adviceMap[issue] || "表达练习今天只改一个最明显的问题。";
}

function fillSampleData() {
  const hasExistingRecords = Object.keys(records).length > 0;

  if (hasExistingRecords) {
    const canOverwrite = window.confirm("将写入最近 7 天示例数据，并可能覆盖这些日期已有记录。继续吗？");
    if (!canOverwrite) {
      return;
    }
  }

  getRecentDateKeys(7).forEach((dateKey, index) => {
    records[dateKey] = createSampleRecord(dateKey, index);
  });

  saveRecords(records);
  currentRecord = records[todayKey] || createEmptyRecord(today);
  renderPage();
  renderAdvice(generateAdvice());
  elements.saveStatus.textContent = "已填充最近 7 天示例数据";
}

function clearAllRecords() {
  const firstConfirm = window.confirm("这会清空 CET-6 Minimal Coach 的所有本地记录。继续吗？");
  if (!firstConfirm) {
    return;
  }

  const secondConfirm = window.confirm("请再确认一次：清空后无法从本工具恢复。");
  if (!secondConfirm) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  records = {};
  currentRecord = createEmptyRecord(today);
  elements.adviceBox.textContent = "记录已清空。今天可以重新开始一个最小闭环。";
  renderPage();
  elements.saveStatus.textContent = "已清空所有记录";
}

function createEmptyRecord(date) {
  const expressionPlan = getExpressionPlan(date);

  return {
    date: formatDateKey(date),
    tasks: {
      listening: false,
      expression: false,
      reflection: false
    },
    expressionType: expressionPlan.label,
    listeningReasons: [],
    expressionIssues: [],
    summary: "",
    tomorrowFocus: "",
    gptFeedback: "",
    updatedAt: ""
  };
}

function createSampleRecord(dateKey, index) {
  const date = parseDateKey(dateKey);
  const expressionPlan = getExpressionPlan(date);
  const taskPatterns = [
    { listening: true, expression: true, reflection: true },
    { listening: true, expression: false, reflection: true },
    { listening: true, expression: true, reflection: false },
    { listening: true, expression: true, reflection: true },
    { listening: false, expression: true, reflection: true },
    { listening: true, expression: true, reflection: true },
    { listening: true, expression: false, reflection: false }
  ];

  return {
    date: dateKey,
    tasks: taskPatterns[index],
    expressionType: expressionPlan.label,
    listeningReasons: [
      listeningReasonOptions[index % listeningReasonOptions.length],
      index % 2 === 0 ? "没定位" : "同义替换没识别"
    ],
    expressionIssues: [
      expressionIssueOptions[index % expressionIssueOptions.length],
      index % 3 === 0 ? "主谓不一致" : "单复数误用"
    ],
    summary: `示例：今天完成了${expressionPlan.label}练习，主要问题是定位和表达不够稳。`,
    tomorrowFocus: "示例：先看题干关键词，再做一小段精练。",
    gptFeedback: "示例：GPT 建议明天先检查主谓一致，再处理搭配。",
    updatedAt: new Date().toISOString()
  };
}

function getExpressionPlan(date) {
  const day = date.getDay();

  if (day === 0) {
    return expressionPlans.review;
  }

  if ([1, 3, 5].includes(day)) {
    return expressionPlans.writing;
  }

  return expressionPlans.translation;
}

function calculateStreak() {
  let streak = 0;
  const date = new Date(today);

  while (true) {
    const dateKey = formatDateKey(date);
    const record = records[dateKey];

    if (!record || !isRecordComplete(record)) {
      break;
    }

    streak += 1;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

function getTopIssuesForCurrentWeek() {
  const issueCounts = {};
  const weekStart = getMonday(today);

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayOffset);
    const record = records[formatDateKey(date)];

    if (!record) {
      continue;
    }

    [...record.listeningReasons, ...record.expressionIssues].forEach((issue) => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  }

  return Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function getTopIssueFromRecords(recordList, fieldName) {
  const issueCounts = {};

  recordList.forEach((record) => {
    record[fieldName].forEach((issue) => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  });

  const [topIssue] = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0] || [];
  return topIssue;
}

function updateSelectedList(list, value, isSelected) {
  if (isSelected && !list.includes(value)) {
    list.push(value);
    return;
  }

  if (!isSelected) {
    const index = list.indexOf(value);
    if (index >= 0) {
      list.splice(index, 1);
    }
  }
}

function countCompletedTasks(record) {
  return Object.values(record.tasks).filter(Boolean).length;
}

function isRecordComplete(record) {
  return countCompletedTasks(record) === 3;
}

function getRecentDateKeys(days) {
  const keys = [];
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days + 1);

  for (let index = 0; index < days; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    keys.push(formatDateKey(date));
  }

  return keys;
}

function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + distanceToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getCountdownText() {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const examStart = new Date(EXAM_DATE);
  examStart.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((examStart - todayStart) / dayMs);

  if (daysLeft > 0) {
    return `${daysLeft} 天`;
  }

  if (daysLeft === 0) {
    return "今天";
  }

  return "已结束";
}

function normalizeRecords(rawRecords) {
  const normalizedRecords = {};

  Object.entries(rawRecords).forEach(([dateKey, record]) => {
    normalizedRecords[dateKey] = {
      ...createEmptyRecord(parseDateKey(dateKey)),
      ...record,
      tasks: {
        listening: Boolean(record.tasks && record.tasks.listening),
        expression: Boolean(record.tasks && record.tasks.expression),
        reflection: Boolean(record.tasks && record.tasks.reflection)
      },
      listeningReasons: Array.isArray(record.listeningReasons) ? record.listeningReasons : [],
      expressionIssues: Array.isArray(record.expressionIssues) ? record.expressionIssues : [],
      gptFeedback: record.gptFeedback || ""
    };
  });

  return normalizedRecords;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(dateKey) {
  const date = parseDateKey(dateKey);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${weekdayNames[date.getDay()]}`;
}

function loadRecords() {
  const rawRecords = localStorage.getItem(STORAGE_KEY);

  if (!rawRecords) {
    return {};
  }

  try {
    const parsedRecords = JSON.parse(rawRecords);
    return parsedRecords && typeof parsedRecords === "object" ? parsedRecords : {};
  } catch (error) {
    console.warn("Failed to parse CET-6 records from localStorage.", error);
    return {};
  }
}

function saveRecords(nextRecords) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
}
