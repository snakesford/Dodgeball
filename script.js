const searchInput = document.querySelector("#player-search");
const sortSelect = document.querySelector("#sort-cards");
const cardGrid = document.querySelector(".card-grid");
const detailModal = document.querySelector("#detail-modal");
const detailCloseButton = document.querySelector(".detail-close");
const loadingState = document.querySelector("#loading-state");
const detailImageWrap = document.querySelector("#detail-image-wrap");

const detailFields = {
  overall: document.querySelector("#detail-overall"),
  role: document.querySelector("#detail-role"),
  name: document.querySelector("#detail-name"),
  meta: document.querySelector("#detail-meta"),
  style: document.querySelector("#detail-style"),
  catches: document.querySelector("#detail-catches"),
  speed: document.querySelector("#detail-speed"),
  winrate: document.querySelector("#detail-winrate"),
  stamina: document.querySelector("#detail-stamina"),
  accuracy: document.querySelector("#detail-accuracy"),
  agility: document.querySelector("#detail-agility"),
  discipline: document.querySelector("#detail-discipline"),
  hands: document.querySelector("#detail-hands"),
  highlights: document.querySelector("#detail-highlights"),
};

const skillFields = {
  power: {
    value: document.querySelector("#skill-power-value"),
    bar: document.querySelector("#skill-power-bar"),
  },
  agility: {
    value: document.querySelector("#skill-agility-value"),
    bar: document.querySelector("#skill-agility-bar"),
  },
  dodging: {
    value: document.querySelector("#skill-dodging-value"),
    bar: document.querySelector("#skill-dodging-bar"),
  },
  catching: {
    value: document.querySelector("#skill-catching-value"),
    bar: document.querySelector("#skill-catching-bar"),
  },
  awareness: {
    value: document.querySelector("#skill-awareness-value"),
    bar: document.querySelector("#skill-awareness-bar"),
  },
  accuracy: {
    value: document.querySelector("#skill-accuracy-value"),
    bar: document.querySelector("#skill-accuracy-bar"),
  },
};

let players = [];
let visiblePlayers = [];
let activeCard = null;

const clampSkill = (value) => Math.max(1, Math.min(10, Number(value) || 1));
const rarityClasses = [
  "rarity-common",
  "rarity-uncommon",
  "rarity-rare",
  "rarity-epic",
  "rarity-legendary",
];

const positiveTerms = [
  "calm",
  "accurate",
  "quick",
  "strong",
  "reliable",
  "efficient",
  "smart",
  "clutch",
  "pressure",
  "captain",
  "fast",
  "high",
  "organizer",
  "stabilizer",
  "finisher",
  "composure",
  "aggressive",
  "power",
];

const negativeTerms = [
  "still learning",
  "inconsistent",
  "needs",
  "developing",
  "cleaner",
  "under pressure",
];

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] || character;
  });

const setSkill = (key, value) => {
  const numericValue = clampSkill(value);
  const field = skillFields[key];

  if (!field) {
    return;
  }

  field.value.textContent = `${numericValue}/10`;
  field.bar.style.width = `${numericValue * 10}%`;
  field.bar.classList.remove("is-low", "is-mid", "is-high", "is-elite");

  if (numericValue <= 3) {
    field.bar.classList.add("is-low");
    return;
  }

  if (numericValue <= 6) {
    field.bar.classList.add("is-mid");
    return;
  }

  if (numericValue <= 9) {
    field.bar.classList.add("is-high");
    return;
  }

  field.bar.classList.add("is-elite");
};

const countMatches = (text, terms) =>
  terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);

const computeOverallScore = (player) => {
  const skillValues = Object.values(player.skills);
  const skillAverage =
    skillValues.reduce((sum, value) => sum + clampSkill(value), 0) / skillValues.length;

  const statScore =
    player.catches * 1.1 +
    player.speed * 0.32 +
    player.winrate * 0.45 +
    player.stamina * 0.28 +
    player.accuracy * 0.25 +
    player.agility * 0.22 +
    player.discipline * 0.18 +
    player.hands * 0.16 +
    player.awareness * 2.2 +
    player.power * 1.8 +
    player.dodging * 1.7 +
    player.catching * 1.9;

  const text = `${player.note} ${player.style} ${player.highlights.join(" ")}`.toLowerCase();
  const textBonus = countMatches(text, positiveTerms) * 1.2 - countMatches(text, negativeTerms) * 1.8;

  const total =
    20 +
    skillAverage * 4.4 +
    statScore / 4.8 +
    textBonus;

  return Math.max(1, Math.min(99, Math.round(total)));
};

const getRarityClass = (score) => {
  if (score >= 90) {
    return "rarity-legendary";
  }

  if (score >= 82) {
    return "rarity-epic";
  }

  if (score >= 72) {
    return "rarity-rare";
  }

  if (score >= 62) {
    return "rarity-uncommon";
  }

  return "rarity-common";
};

const openDetail = (playerId) => {
  const player = players.find((entry) => entry.id === playerId);

  if (!player || !detailModal) {
    return;
  }

  activeCard = cardGrid?.querySelector(`[data-player-id="${playerId}"]`) || null;
  detailFields.overall.textContent = `Top ${player.topPercent}% • Score ${player.score}`;
  detailFields.role.textContent = player.role;
  detailFields.name.textContent = player.name;
  detailFields.meta.textContent = `Age ${player.age} • ${player.team}`;
  detailFields.style.textContent = player.style;
  detailFields.catches.textContent = String(player.catches);
  detailFields.speed.textContent = `${player.speed} mph`;
  detailFields.winrate.textContent = `${player.winrate}%`;
  detailFields.stamina.textContent = String(player.stamina);
  detailFields.accuracy.textContent = String(player.accuracy);
  detailFields.agility.textContent = String(player.agility);
  detailFields.discipline.textContent = String(player.discipline);
  detailFields.hands.textContent = String(player.hands);
  detailFields.highlights.textContent = player.highlights.join(", ");
  detailImageWrap?.classList.remove(...rarityClasses);
  detailImageWrap?.classList.add(player.rarityClass);
  setSkill("power", player.skills.power);
  setSkill("agility", player.skills.agility);
  setSkill("dodging", player.skills.dodging);
  setSkill("catching", player.skills.catching);
  setSkill("awareness", player.skills.awareness);
  setSkill("accuracy", player.skills.accuracy);
  detailModal.hidden = false;
  document.body.style.overflow = "hidden";
  detailCloseButton?.focus();
};

const closeDetail = () => {
  if (!detailModal) {
    return;
  }

  detailModal.hidden = true;
  document.body.style.overflow = "";
  activeCard?.focus();
};

const buildSearchText = (player) =>
  [
    player.name,
    player.age,
    player.role,
    player.team,
    player.trait,
    player.note,
    player.style,
    player.catches,
    player.speed,
    player.winrate,
    player.stamina,
    player.overall,
    ...player.highlights,
    ...Object.keys(player.skills),
    ...Object.values(player.skills),
  ]
    .join(" ")
    .toLowerCase();

const createCardMarkup = (player) => `
  <article
    class="player-card"
    data-player-id="${escapeHtml(player.id)}"
    tabindex="0"
    role="button"
    aria-label="Open detailed stats for ${escapeHtml(player.name)}, age ${escapeHtml(player.age)}"
  >
    <div class="card-topline">
      <span class="tag">Featured</span>
      <span class="rating">Top ${escapeHtml(player.topPercent)}% • Score ${escapeHtml(player.score)}</span>
    </div>

    <div class="profile-wrap ${escapeHtml(player.rarityClass)}">
      <img
        src="./stephen-profile.svg"
        alt="Illustrated profile portrait of ${escapeHtml(player.name)}"
        class="profile-image"
        width="220"
        height="220"
      />
    </div>

    <div class="card-copy">
      <div>
        <p class="player-role">${escapeHtml(player.role)}</p>
        <h2>${escapeHtml(player.name)}</h2>
      </div>
      <p class="player-meta">Age ${escapeHtml(player.age)} • ${escapeHtml(player.team)}</p>
      ${
        player.trait
          ? `<p class="player-trait" aria-label="Trait">${escapeHtml(player.trait)}</p>`
          : ""
      }
      <p class="player-note">${escapeHtml(player.note)}</p>
    </div>

    <dl class="stat-list">
      <div>
        <dt>Catches</dt>
        <dd>${escapeHtml(player.catches)}</dd>
      </div>
      <div>
        <dt>Throw Speed</dt>
        <dd>${escapeHtml(player.speed)} mph</dd>
      </div>
      <div>
        <dt>Win Rate</dt>
        <dd>${escapeHtml(player.winrate)}%</dd>
      </div>
      <div>
        <dt>Stamina</dt>
        <dd>${escapeHtml(player.stamina)}</dd>
      </div>
    </dl>
  </article>
`;

const attachCardEvents = () => {
  const cards = Array.from(cardGrid?.querySelectorAll(".player-card") || []);

  cards.forEach((card) => {
    const playerId = card.getAttribute("data-player-id");

    if (!playerId) {
      return;
    }

    card.addEventListener("click", () => openDetail(playerId));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetail(playerId);
      }
    });
  });
};

const renderCards = (list) => {
  if (!cardGrid) {
    return;
  }

  if (list.length === 0) {
    cardGrid.innerHTML =
      '<div class="loading-state">No players match that search.</div>';
    return;
  }

  cardGrid.innerHTML = list.map(createCardMarkup).join("");
  attachCardEvents();
};

const sortPlayers = (list, mode) => {
  const sorted = [...list];

  sorted.sort((a, b) => {
    if (mode === "name-asc") {
      return a.name.localeCompare(b.name);
    }

    if (mode === "age-asc") {
      return a.age - b.age;
    }

    if (mode === "age-desc") {
      return b.age - a.age;
    }

    if (mode === "overall-desc") {
      return b.score - a.score;
    }

    if (mode === "catches-desc") {
      return b.catches - a.catches;
    }

    return a.defaultIndex - b.defaultIndex;
  });

  return sorted;
};

const updateCards = () => {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const mode = sortSelect?.value || "default";

  visiblePlayers = players.filter((player) => player.searchText.includes(query));
  visiblePlayers = sortPlayers(visiblePlayers, mode);
  renderCards(visiblePlayers);
};

const loadPlayers = async () => {
  if (!cardGrid) {
    return;
  }

  try {
    const response = await fetch("./players.json");

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const data = await response.json();
    players = data.players.map((player, index) => ({
      ...player,
      defaultIndex: index,
      score: computeOverallScore(player),
      rarityClass: "",
      searchText: buildSearchText(player),
    })).map((player) => ({
      ...player,
      rarityClass: getRarityClass(player.score),
    }));

    loadingState?.remove();
    updateCards();
  } catch (error) {
    if (loadingState) {
      loadingState.textContent =
        "Could not load player data. Serve the folder through a local web server to use the JSON feed.";
    }
  }
};

searchInput?.addEventListener("input", updateCards);
sortSelect?.addEventListener("change", updateCards);
detailCloseButton?.addEventListener("click", closeDetail);
detailModal?.addEventListener("click", (event) => {
  const target = event.target;

  if (target instanceof HTMLElement && target.dataset.closeDetail === "true") {
    closeDetail();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && detailModal && !detailModal.hidden) {
    closeDetail();
  }
});

loadPlayers();
