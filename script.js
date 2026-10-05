
function el(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.attrs) {
    for (const [key, val] of Object.entries(options.attrs)) {
      element.setAttribute(key, val);
    }
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.children) {
    options.children.forEach((child) => {
      if (child) element.appendChild(child);
    });
  }

  return element;
}

function clearElement(element) {
  element.replaceChildren();
}

const CARD_ICONS = [
  { id: "pig-pink", uri: "images/pig-pink.svg" },
  { id: "pig-mint", uri: "images/pig-mint.svg" },
  { id: "pig-yellow", uri: "images/pig-yellow.svg" },
  { id: "pig-orange", uri: "images/pig-orange.svg" },
  { id: "pig-blue", uri: "images/pig-blue.svg" },
  { id: "pig-purple", uri: "images/pig-purple.svg" },
  { id: "pig-green", uri: "images/pig-green.svg" },
  { id: "pig-brown", uri: "images/pig-brown.svg" },
];

class Modal {
  constructor() {
    this.overlay = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  open({ title, contentNode, actions = [] }) {
    this.close();

    const titleEl = el("h2", { className: "modal-title", text: title });
    const bodyEl = el("div", {
      className: "modal-body",
      children: [contentNode],
    });

    const actionsEl = el("div", {
      className: "modal-actions",
      children: actions.map((act) => {
        const button = el("button", {
          className: `btn ${act.primary ? "btn--primary" : ""}`,
          text: act.text,
        });
        button.addEventListener("click", () => {
          act.onClick();
        });
        return button;
      }),
    });

    const dialog = el("div", {
      className: "modal-content",
      attrs: { role: "dialog", "aria-modal": "true" },
      children: [titleEl, bodyEl, actionsEl],
    });

    dialog.addEventListener("click", (e) => e.stopPropagation());

    this.overlay = el("div", {
      className: "modal-overlay",
      children: [dialog],
    });

    this.overlay.addEventListener("click", () => this.close());

    document.body.appendChild(this.overlay);
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", this.handleKeyDown);
  }

  close() {
    if (this.overlay) {
      document.removeEventListener("keydown", this.handleKeyDown);
      this.overlay.remove();
      this.overlay = null;
      document.body.classList.remove("modal-open");
    }
  }

  handleKeyDown(e) {
    if (e.key === "Escape") {
      this.close();
    }
  }
}

const STORAGE_KEY = "memory_game_leaderboard";

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveScore(moves) {
  const list = getLeaderboard();
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const formattedDate = `${day}.${month}.${year}`;

  list.push({
    moves,
    date: formattedDate,
    timestamp: now.getTime(),
  });

  list.sort((a, b) => {
    if (a.moves !== b.moves) {
      return a.moves - b.moves;
    }
    return a.timestamp - b.timestamp;
  });

  const top10 = list.slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top10));
  } catch (err) {
    console.warn("Не удалось сохранить результат в localStorage", err);
  }
}

class MemoryGame {
  constructor() {
    this.modal = new Modal();
    this.moves = 0;
    this.pairsFound = 0;
    this.firstCard = null;
    this.secondCard = null;
    this.isLocked = false;
    this.mismatchTimeoutId = null;
    this.isGameCompleted = false;

    this.initUI();
    this.startNewGame();
  }

  initUI() {
    this.btnNewGame = el("button", {
      className: "btn btn--primary",
      text: "Новая игра",
      attrs: { "aria-label": "Новая игра" },
    });
    this.btnLeaderboard = el("button", {
      className: "btn",
      text: "Таблица лидеров",
      attrs: { "aria-label": "Таблица лидеров" },
    });

    this.btnNewGame.addEventListener("click", () => this.startNewGame());
    this.btnLeaderboard.addEventListener("click", () => this.showLeaderboard());

    const headerActions = el("div", {
      className: "header__actions",
      children: [this.btnNewGame, this.btnLeaderboard],
    });

    const title = el("h1", { text: "Memory Game" });
    const header = el("header", {
      className: "header",
      children: [title, headerActions],
    });

    this.movesSpan = el("span", { className: "stats__value", text: "0" });
    this.pairsSpan = el("span", { className: "stats__value", text: "0 / 8" });

    const statsMoves = el("div", {
      className: "stats__item",
      children: [document.createTextNode("Ходы: "), this.movesSpan],
    });
    const statsPairs = el("div", {
      className: "stats__item",
      children: [document.createTextNode("Пары: "), this.pairsSpan],
    });

    const stats = el("div", {
      className: "stats",
      children: [statsMoves, statsPairs],
    });

    this.board = el("main", { className: "board" });

    document.body.appendChild(header);
    document.body.appendChild(stats);
    document.body.appendChild(this.board);
  }

  startNewGame() {
    if (this.mismatchTimeoutId) {
      clearTimeout(this.mismatchTimeoutId);
      this.mismatchTimeoutId = null;
    }

    this.moves = 0;
    this.pairsFound = 0;
    this.firstCard = null;
    this.secondCard = null;
    this.isLocked = false;
    this.isGameCompleted = false;
    this.updateStats();

    this.modal.close();

    const deck = [];
    CARD_ICONS.forEach((icon) => {
      deck.push({ id: icon.id, uri: icon.uri });
      deck.push({ id: icon.id, uri: icon.uri });
    });
    this.shuffle(deck);

    clearElement(this.board);
    deck.forEach((item) => {
      const cardEl = this.createCardElement(item);
      this.board.appendChild(cardEl);
    });
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  createCardElement(item) {
    const card = el("button", {
      className: "card",
      attrs: { "aria-label": "Карточка рубашкой вверх", type: "button" },
    });
    card.dataset.id = item.id;

    const backSide = el("div", { className: "card__side card__side--back" });

    const img = el("img", {
      className: "card__icon",
      attrs: { src: item.uri, alt: item.id },
    });
    const frontSide = el("div", {
      className: "card__side card__side--front",
      children: [img],
    });

    card.appendChild(backSide);
    card.appendChild(frontSide);

    card.addEventListener("click", () => this.handleCardClick(card));
    return card;
  }

  handleCardClick(card) {
   
    if (this.isLocked || this.isGameCompleted) return;
    if (
      card.classList.contains("is-flipped") ||
      card.classList.contains("is-matched")
    )
      return;
    if (card === this.firstCard) return;

  
    card.classList.add("is-flipped");

    if (!this.firstCard) {
      this.firstCard = card;
      return;
    }

    this.secondCard = card;
    this.moves += 1;
    this.updateStats();

    this.checkMatch();
  }

  checkMatch() {
    const isMatch = this.firstCard.dataset.id === this.secondCard.dataset.id;

    if (isMatch) {
      this.firstCard.classList.add("is-matched");
      this.secondCard.classList.add("is-matched");
      this.pairsFound += 1;
      this.updateStats();

      this.firstCard = null;
      this.secondCard = null;

      if (this.pairsFound === 8) {
        this.handleWin();
      }
    } else {
      this.isLocked = true;
      this.mismatchTimeoutId = setTimeout(() => {
        if (this.firstCard) this.firstCard.classList.remove("is-flipped");
        if (this.secondCard) this.secondCard.classList.remove("is-flipped");
        this.firstCard = null;
        this.secondCard = null;
        this.isLocked = false;
        this.mismatchTimeoutId = null;
      }, 1000);
    }
  }

  handleWin() {
    this.isGameCompleted = true;
    saveScore(this.moves);

    const winContent = el("div", {
      children: [
        el("p", {
          text: `Поздравляем! Вы нашли все пары за ${this.moves} ${this.getMovesNoun(this.moves)}.`,
        }),
      ],
    });

    this.modal.open({
      title: "Победа!",
      contentNode: winContent,
      actions: [
        {
          text: "Новая игра",
          primary: true,
          onClick: () => this.startNewGame(),
        },
        {
          text: "Закрыть",
          onClick: () => this.modal.close(),
        },
      ],
    });
  }

  showLeaderboard() {
    const scores = getLeaderboard();
    let contentNode;

    if (scores.length === 0) {
      contentNode = el("div", {
        className: "empty-state",
        text: "Пока нет результатов",
      });
    } else {
      const table = el("table", { className: "table" });

      const thead = el("thead", {
        children: [
          el("tr", {
            children: [
              el("th", { text: "Место" }),
              el("th", { text: "Ходы" }),
              el("th", { text: "Дата" }),
            ],
          }),
        ],
      });

      const tbody = el("tbody");
      scores.forEach((entry, idx) => {
        const row = el("tr", {
          children: [
            el("td", { text: String(idx + 1) }),
            el("td", { text: String(entry.moves) }),
            el("td", { text: entry.date }),
          ],
        });
        tbody.appendChild(row);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      contentNode = table;
    }

    this.modal.open({
      title: "Таблица лидеров (Топ-10)",
      contentNode,
      actions: [
        {
          text: "Закрыть",
          primary: false,
          onClick: () => this.modal.close(),
        },
      ],
    });
  }

  updateStats() {
    this.movesSpan.textContent = String(this.moves);
    this.pairsSpan.textContent = `${this.pairsFound} / 8`;
  }

  getMovesNoun(n) {
    const abs = Math.abs(n) % 100;
    const rem = abs % 10;
    if (abs > 10 && abs < 20) return "ходов";
    if (rem > 1 && rem < 5) return "хода";
    if (rem === 1) return "ход";
    return "ходов";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MemoryGame();
});
