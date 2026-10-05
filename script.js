const PIGS = [
  "pig-pink",
  "pig-mint",
  "pig-yellow",
  "pig-orange",
  "pig-blue",
  "pig-purple",
  "pig-green",
  "pig-brown",
];

let moves = 0;
let foundPairs = 0;
let firstCard = null;
let secondCard = null;
let isLocked = false;
let flipTimer = null;
let isGameOver = false;

let movesSpan;
let pairsSpan;
let boardEl;
let activeModal = null;

function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", handleEsc);
  }
}

function handleEsc(e) {
  if (e.key === "Escape") {
    closeModal();
  }
}

function openModal(titleText, contentNode, buttons) {
  closeModal();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal-content";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const title = document.createElement("h2");
  title.className = "modal-title";
  title.textContent = titleText;

  const body = document.createElement("div");
  body.className = "modal-body";
  body.appendChild(contentNode);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  for (let i = 0; i < buttons.length; i++) {
    const btn = document.createElement("button");
    btn.className = buttons[i].primary ? "btn btn--primary" : "btn";
    btn.textContent = buttons[i].text;
    btn.addEventListener("click", buttons[i].action);
    actions.appendChild(btn);
  }

  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(actions);

  modal.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  overlay.appendChild(modal);

  overlay.addEventListener("click", function () {
    closeModal();
  });

  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");
  document.addEventListener("keydown", handleEsc);

  activeModal = overlay;
}

function getLeaderboard() {
  const data = localStorage.getItem("memory_game_leaderboard");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveScore(movesCount) {
  const list = getLeaderboard();
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  list.push({
    moves: movesCount,
    date: `${day}.${month}.${year}`,
    time: date.getTime(),
  });

  list.sort(function (a, b) {
    if (a.moves !== b.moves) {
      return a.moves - b.moves;
    }
    return a.time - b.time;
  });

  const top10 = list.slice(0, 10);
  try {
    localStorage.setItem("memory_game_leaderboard", JSON.stringify(top10));
  } catch (e) {}
}

function showLeaderboard() {
  const records = getLeaderboard();
  const container = document.createElement("div");

  if (records.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Пока нет результатов";
    container.appendChild(empty);
  } else {
    const table = document.createElement("table");
    table.className = "table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    const thPlace = document.createElement("th");
    thPlace.textContent = "Место";
    const thMoves = document.createElement("th");
    thMoves.textContent = "Ходы";
    const thDate = document.createElement("th");
    thDate.textContent = "Дата";

    headRow.appendChild(thPlace);
    headRow.appendChild(thMoves);
    headRow.appendChild(thDate);
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let i = 0; i < records.length; i++) {
      const row = document.createElement("tr");

      const tdPlace = document.createElement("td");
      tdPlace.textContent = i + 1;

      const tdMoves = document.createElement("td");
      tdMoves.textContent = records[i].moves;

      const tdDate = document.createElement("td");
      tdDate.textContent = records[i].date;

      row.appendChild(tdPlace);
      row.appendChild(tdMoves);
      row.appendChild(tdDate);
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  }

  openModal("Таблица лидеров (Топ-10)", container, [
    {
      text: "Закрыть",
      primary: false,
      action: closeModal,
    },
  ]);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function createCard(pigName) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.setAttribute("aria-label", "Карточка");
  card.dataset.pig = pigName;

  const backSide = document.createElement("div");
  backSide.className = "card__side card__side--back";

  const frontSide = document.createElement("div");
  frontSide.className = "card__side card__side--front";

  const icon = document.createElement("img");
  icon.className = "card__icon";
  icon.src = "images/" + pigName + ".svg";
  icon.alt = pigName;

  frontSide.appendChild(icon);
  card.appendChild(backSide);
  card.appendChild(frontSide);

  card.addEventListener("click", function () {
    handleCardClick(card);
  });

  return card;
}

function handleCardClick(card) {
  if (isLocked || isGameOver) return;
  if (
    card.classList.contains("is-flipped") ||
    card.classList.contains("is-matched")
  )
    return;
  if (card === firstCard) return;

  card.classList.add("is-flipped");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  moves++;
  updateCounters();

  checkMatch();
}

function checkMatch() {
  const match = firstCard.dataset.pig === secondCard.dataset.pig;

  if (match) {
    firstCard.classList.add("is-matched");
    secondCard.classList.add("is-matched");
    foundPairs++;
    updateCounters();

    firstCard = null;
    secondCard = null;

    if (foundPairs === 8) {
      handleWin();
    }
  } else {
    isLocked = true;
    flipTimer = setTimeout(function () {
      if (firstCard) firstCard.classList.remove("is-flipped");
      if (secondCard) secondCard.classList.remove("is-flipped");
      firstCard = null;
      secondCard = null;
      isLocked = false;
      flipTimer = null;
    }, 1000);
  }
}

function handleWin() {
  isGameOver = true;
  saveScore(moves);

  const container = document.createElement("div");
  const text = document.createElement("p");
  text.textContent = "Поздравляем! Вы нашли все пары за " + moves + " ходов.";
  container.appendChild(text);

  openModal("Победа!", container, [
    {
      text: "Новая игра",
      primary: true,
      action: startNewGame,
    },
    {
      text: "Закрыть",
      primary: false,
      action: closeModal,
    },
  ]);
}

function updateCounters() {
  movesSpan.textContent = moves;
  pairsSpan.textContent = foundPairs + " / 8";
}

function startNewGame() {
  if (flipTimer) {
    clearTimeout(flipTimer);
    flipTimer = null;
  }

  moves = 0;
  foundPairs = 0;
  firstCard = null;
  secondCard = null;
  isLocked = false;
  isGameOver = false;
  updateCounters();

  closeModal();

  let deck = [];
  for (let i = 0; i < PIGS.length; i++) {
    deck.push(PIGS[i]);
    deck.push(PIGS[i]);
  }
  shuffle(deck);

  while (boardEl.firstChild) {
    boardEl.removeChild(boardEl.firstChild);
  }

  for (let i = 0; i < deck.length; i++) {
    const cardElement = createCard(deck[i]);
    boardEl.appendChild(cardElement);
  }
}

function initGame() {
  const header = document.createElement("header");
  header.className = "header";

  const heading = document.createElement("h1");
  heading.textContent = "Memory Game";

  const headerBtns = document.createElement("div");
  headerBtns.className = "header__actions";

  const newGameBtn = document.createElement("button");
  newGameBtn.className = "btn btn--primary";
  newGameBtn.textContent = "Новая игра";
  newGameBtn.setAttribute("aria-label", "Новая игра");
  newGameBtn.addEventListener("click", startNewGame);

  const leaderboardBtn = document.createElement("button");
  leaderboardBtn.className = "btn";
  leaderboardBtn.textContent = "Таблица лидеров";
  leaderboardBtn.setAttribute("aria-label", "Таблица лидеров");
  leaderboardBtn.addEventListener("click", showLeaderboard);

  headerBtns.appendChild(newGameBtn);
  headerBtns.appendChild(leaderboardBtn);
  header.appendChild(heading);
  header.appendChild(headerBtns);

  const stats = document.createElement("div");
  stats.className = "stats";

  const movesBox = document.createElement("div");
  movesBox.className = "stats__item";
  movesBox.appendChild(document.createTextNode("Ходы: "));
  movesSpan = document.createElement("span");
  movesSpan.className = "stats__value";
  movesSpan.textContent = "0";
  movesBox.appendChild(movesSpan);

  const pairsBox = document.createElement("div");
  pairsBox.className = "stats__item";
  pairsBox.appendChild(document.createTextNode("Пары: "));
  pairsSpan = document.createElement("span");
  pairsSpan.className = "stats__value";
  pairsSpan.textContent = "0 / 8";
  pairsBox.appendChild(pairsSpan);

  stats.appendChild(movesBox);
  stats.appendChild(pairsBox);

  boardEl = document.createElement("main");
  boardEl.className = "board";

  document.body.appendChild(header);
  document.body.appendChild(stats);
  document.body.appendChild(boardEl);

  startNewGame();
}

initGame();
