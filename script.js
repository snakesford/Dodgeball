const searchInput = document.querySelector("#player-search");
const sortSelect = document.querySelector("#sort-cards");
const cardGrid = document.querySelector(".card-grid");
const detailModal = document.querySelector("#detail-modal");
const detailCloseButton = document.querySelector(".detail-close");
const loadingState = document.querySelector("#loading-state");
const detailImageWrap = document.querySelector("#detail-image-wrap");
const detailSpeedRow = document.querySelector("#detail-speed-row");
const detailExtraSkillRow = document.querySelector("#skill-extra-row");
const detailExtraSkillLabel = document.querySelector("#skill-extra-label");

const detailFields = {
  topPercent: document.querySelector("#detail-top-percent"),
  score: document.querySelector("#detail-score"),
  role: document.querySelector("#detail-role"),
  name: document.querySelector("#detail-name"),
  meta: document.querySelector("#detail-meta"),
  tier: document.querySelector("#detail-tier"),
  speed: document.querySelector("#detail-speed"),
  playsMostLike: document.querySelector("#detail-plays-most-like"),
  note: document.querySelector("#detail-note"),
  highlights: document.querySelector("#detail-highlights"),
  countering: document.querySelector("#detail-countering"),
  history: document.querySelector("#detail-history"),
};

const skillFields = {
  power: {
    value: document.querySelector("#skill-power-value"),
    bar: document.querySelector("#skill-power-bar"),
  },
  stamina: {
    value: document.querySelector("#skill-stamina-value"),
    bar: document.querySelector("#skill-stamina-bar"),
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
  extra: {
    value: document.querySelector("#skill-extra-value"),
    bar: document.querySelector("#skill-extra-bar"),
  },
  effort: {
    value: document.querySelector("#skill-effort-value"),
    bar: document.querySelector("#skill-effort-bar"),
  },
};

const coreSkillKeys = [
  "power",
  "stamina",
  "agility",
  "dodging",
  "catching",
  "awareness",
  "accuracy",
];

let players = [];
let visiblePlayers = [];
let activeCard = null;
const missingValueLabel = "No value currently";

const clampSkill = (value, minimum = 1) => Math.max(minimum, Math.min(10, Number(value) || 0));
const formatAgeRange = (age) => {
  const numericAge = Number(age);

  if (!Number.isFinite(numericAge)) {
    return "";
  }

  const decade = Math.floor(numericAge / 10) * 10;
  return `${decade}'s`;
};

const displayValue = (value) => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || missingValueLabel;
};

const displayListValue = (list) => {
  const normalizedList = Array.isArray(list)
    ? list.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  return normalizedList.length > 0 ? normalizedList.join(", ") : missingValueLabel;
};

const hasDisplayValue = (value) => String(value ?? "").trim().length > 0;

const rarityClasses = [
  "rarity-common",
  "rarity-uncommon",
  "rarity-rare",
  "rarity-epic",
  "rarity-legendary",
];

const tierSortOrder = {
  S: 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
};

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

const setSkill = (key, value, minimum = 1) => {
  const numericValue = clampSkill(value, minimum);
  const field = skillFields[key];

  if (!field) {
    return;
  }

  field.value.textContent = `${numericValue}/10`;
  field.bar.style.width = `${numericValue * 10}%`;
  field.bar.classList.remove("is-low", "is-ok", "is-mid", "is-high", "is-elite", "is-max");

  if (numericValue <= 2) {
    field.bar.classList.add("is-low");
    return;
  }

  if (numericValue <= 4) {
    field.bar.classList.add("is-ok");
    return;
  }

  if (numericValue <= 6) {
    field.bar.classList.add("is-mid");
    return;
  }

  if (numericValue <= 8) {
    field.bar.classList.add("is-high");
    return;
  }

  if (numericValue === 9) {
    field.bar.classList.add("is-elite");
    return;
  }

  field.bar.classList.add("is-max");
};

const readNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const hasSpeedValue = (value) => Number.isFinite(Number(value));

const getSkillToneClass = (value, minimum = 1) => {
  const numericValue = clampSkill(value, minimum);

  if (numericValue <= 2) {
    return "is-low";
  }

  if (numericValue <= 4) {
    return "is-ok";
  }

  if (numericValue <= 6) {
    return "is-mid";
  }

  if (numericValue <= 8) {
    return "is-high";
  }

  if (numericValue === 9) {
    return "is-elite";
  }

  return "is-max";
};

const countMatches = (text, terms) =>
  terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);

const computeOverallScore = (player) => {
  const skillValues = coreSkillKeys.map((key) => player.skills[key]);
  const skillAverage =
    skillValues.reduce((sum, value) => sum + clampSkill(value), 0) / skillValues.length;

  const statScore =
    readNumber(player.catches) * 1.1 +
    readNumber(player.speed, 30) * 0.32 +
    readNumber(player.stamina) * 0.28 +
    readNumber(player.agility) * 0.22 +
    readNumber(player.hands) * 0.16 +
    readNumber(player.power, player.skills.power) * 1.8 +
    clampSkill(player.skills.dodging) * 1.7 +
    clampSkill(player.skills.catching) * 1.9 +
    clampSkill(player.skills.awareness) * 2.2 +
    clampSkill(player.skills.accuracy) * 2.5;

  const text = `${player.note} ${player.highlights.join(" ")}`.toLowerCase();
  const textBonus = countMatches(text, positiveTerms) * 1.2 - countMatches(text, negativeTerms) * 1.8;

  const total =
    20 +
    skillAverage * 4.4 +
    statScore / 4.8 +
    textBonus;

  if (!Number.isFinite(total)) {
    return readNumber(player.overall, 50);
  }

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

const getTierInfo = (score) => {
  if (score >= 90) {
    return { code: "S", label: "Star Player", className: "tier-s" };
  }

  if (score >= 82) {
    return { code: "A", label: "Core Player", className: "tier-a" };
  }

  if (score >= 72) {
    return { code: "B", label: "Soldier Player", className: "tier-b" };
  }

  if (score >= 62) {
    return { code: "C", label: "Situational", className: "tier-c" };
  }

  return { code: "D", label: "Weak", className: "tier-d" };
};

const getTierInfoFromCode = (tierCode) => {
  const normalizedCode = String(tierCode || "").trim().toUpperCase();

  if (normalizedCode === "S") {
    return { code: "S", label: "Star Player", className: "tier-s" };
  }

  if (normalizedCode === "A") {
    return { code: "A", label: "Core Player", className: "tier-a" };
  }

  if (normalizedCode === "B") {
    return { code: "B", label: "Soldier Player", className: "tier-b" };
  }

  if (normalizedCode === "C") {
    return { code: "C", label: "Situational", className: "tier-c" };
  }

  if (normalizedCode === "D") {
    return { code: "D", label: "Weak", className: "tier-d" };
  }

  return null;
};

const decodeHtmlEntities = (text) =>
  String(text).replace(/&#x([0-9a-f]+);|&#(\d+);|&quot;|&amp;/gi, (match, hex, dec) => {
    if (hex) {
      return String.fromCodePoint(parseInt(hex, 16));
    }

    if (dec) {
      return String.fromCodePoint(parseInt(dec, 10));
    }

    if (match === "&quot;") {
      return '"';
    }

    if (match === "&amp;") {
      return "&";
    }

    return match;
  });

const sanitizePlayerJson = (text) =>
  decodeHtmlEntities(text)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([\[{])\s*,/g, "$1");

const parsePlayersPayload = (text) => {
  const sanitizedText = sanitizePlayerJson(text);
  return JSON.parse(sanitizedText);
};

const createDefaultSkills = () => ({
  power: 0,
  stamina: 0,
  agility: 0,
  dodging: 0,
  catching: 0,
  awareness: 0,
  accuracy: 0,
});

const normalizePlayer = (player, index) => {
  const safePlayer = player && typeof player === "object" ? player : {};
  const skills = safePlayer.skills && typeof safePlayer.skills === "object"
    ? safePlayer.skills
    : {};
  const name = String(safePlayer.name || safePlayer.id || `Player ${index + 1}`).trim();

  return {
    id: String(safePlayer.id || name || `player-${index + 1}`),
    name,
    age: readNumber(safePlayer.age),
    role: String(safePlayer.role || ""),
    tier: safePlayer.tier,
    effort: Math.max(0, Math.min(10, readNumber(safePlayer.effort))),
    overall: readNumber(safePlayer.overall),
    topPercent: readNumber(safePlayer.topPercent),
    speed: safePlayer.speed,
    playsMostLike: String(safePlayer.playsMostLike || ""),
    note: String(safePlayer.note || ""),
    highlights: Array.isArray(safePlayer.highlights) ? safePlayer.highlights : [],
    catches: safePlayer.catches,
    stamina: safePlayer.stamina,
    agility: safePlayer.agility,
    hands: safePlayer.hands,
    power: safePlayer.power,
    trait: safePlayer.trait,
    countering: String(safePlayer.countering || ""),
    history: String(safePlayer.history || ""),
    skills: {
      ...createDefaultSkills(),
      ...skills,
    },
  };
};

const applyTopPercentRanks = (list) => {
  const rankedIds = [...list]
    .sort((a, b) => b.score - a.score)
    .map((player) => player.id);

  const totalPlayers = Math.max(rankedIds.length, 1);

  return list.map((player) => {
    const rankIndex = rankedIds.indexOf(player.id);
    const topPercent = Math.max(1, Math.round(((rankIndex + 1) / totalPlayers) * 100));

    return {
      ...player,
      topPercent,
    };
  });
};

const openDetail = (playerId) => {
  const player = players.find((entry) => entry.id === playerId);

  if (!player || !detailModal) {
    return;
  }

  activeCard = cardGrid?.querySelector(`[data-player-id="${playerId}"]`) || null;
  detailFields.topPercent.textContent = `Top ${player.topPercent}%`;
  detailFields.score.textContent = `Score ${player.score}`;
  detailFields.role.textContent = displayValue(player.role);
  detailFields.name.textContent = player.name;
  detailFields.meta.textContent = formatAgeRange(player.age)
    ? `Age ${formatAgeRange(player.age)}`
    : missingValueLabel;
  detailFields.tier.textContent = `${player.tier.code} • ${player.tier.label}`;
  detailFields.tier.className = `tier-label ${player.tier.className}`;
  if (hasSpeedValue(player.speed)) {
    detailFields.speed.textContent = `${player.speed} mph`;
    detailSpeedRow.hidden = false;
  } else {
    detailFields.speed.textContent = "";
    detailSpeedRow.hidden = true;
  }
  detailFields.playsMostLike.textContent = displayValue(player.playsMostLike);
  detailFields.note.textContent = displayValue(player.note);
  detailFields.highlights.textContent = displayListValue(player.highlights);
  detailFields.countering.textContent = displayValue(player.countering);
  detailFields.history.textContent = displayValue(player.history);
  detailImageWrap?.classList.remove(...rarityClasses);
  detailImageWrap?.classList.add(player.rarityClass);
  setSkill("power", player.skills.power);
  setSkill("stamina", player.skills.stamina);
  setSkill("agility", player.skills.agility);
  setSkill("dodging", player.skills.dodging);
  setSkill("catching", player.skills.catching);
  setSkill("awareness", player.skills.awareness);
  setSkill("accuracy", player.skills.accuracy);
  if (Number.isFinite(Number(player.skills.creativityWithSwears))) {
    detailExtraSkillLabel.textContent = "Creativity with Swears";
    setSkill("extra", player.skills.creativityWithSwears);
    detailExtraSkillRow.hidden = false;
  } else {
    detailExtraSkillRow.hidden = true;
  }
  setSkill("effort", player.effort, 0);
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
    formatAgeRange(player.age),
    player.role,
    player.trait,
    player.note,
    player.catches,
    player.speed,
    player.effort,
    player.stamina,
    player.overall,
    player.tier?.code,
    player.tier?.label,
    ...player.highlights,
    ...Object.keys(player.skills),
    ...Object.values(player.skills),
  ]
    .join(" ")
    .toLowerCase();

const shouldShowCardSkills = (player) =>
  Boolean(formatAgeRange(player.age)) &&
  hasDisplayValue(player.role) &&
  hasDisplayValue(player.note);

const createCardMarkup = (player) => `
  <article
    class="player-card"
    data-player-id="${escapeHtml(player.id)}"
    tabindex="0"
    role="button"
    aria-label="Open detailed stats for ${escapeHtml(player.name)}, age ${escapeHtml(formatAgeRange(player.age))}"
  >
    <div class="card-topline">
      <span class="rating">Top ${escapeHtml(player.topPercent)}%</span>
      <span class="rating">Score ${escapeHtml(player.score)}</span>
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

    <p class="player-meta">${
      formatAgeRange(player.age)
        ? `Age ${escapeHtml(formatAgeRange(player.age))}`
        : escapeHtml(missingValueLabel)
    }</p>

    <div class="card-copy">
      <div>
        <p class="player-role">${escapeHtml(displayValue(player.role))}</p>
        <h2>${escapeHtml(player.name)}</h2>
      </div>
      ${
        player.trait
          ? `<p class="player-trait" aria-label="Trait">${escapeHtml(player.trait)}</p>`
          : ""
      }
      <p class="player-note">${escapeHtml(displayValue(player.note))}</p>

      <div class="card-meta-row">
        <p class="tier-label ${escapeHtml(player.tier.className)}">Tier ${escapeHtml(player.tier.code)} • ${escapeHtml(player.tier.label)}</p>
      </div>

      ${
        shouldShowCardSkills(player)
          ? `<div class="card-skill-bars" aria-label="Player skill breakdown">
        <div class="skill-row">
          <div class="skill-head">
            <span>Power</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.power)}" style="width: ${escapeHtml(clampSkill(player.skills.power) * 10)}%"></span></div>
        </div>
        <div class="skill-row">
          <div class="skill-head">
            <span>Stamina</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.stamina)}" style="width: ${escapeHtml(clampSkill(player.skills.stamina) * 10)}%"></span></div>
        </div>
        <div class="skill-row">
          <div class="skill-head">
            <span>Agility</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.agility)}" style="width: ${escapeHtml(clampSkill(player.skills.agility) * 10)}%"></span></div>
        </div>
        <div class="skill-row">
          <div class="skill-head">
            <span>Dodging</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.dodging)}" style="width: ${escapeHtml(clampSkill(player.skills.dodging) * 10)}%"></span></div>
        </div>
        <div class="skill-row">
          <div class="skill-head">
            <span>Catching</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.catching)}" style="width: ${escapeHtml(clampSkill(player.skills.catching) * 10)}%"></span></div>
        </div>
        <div class="skill-row">
          <div class="skill-head">
            <span>Awareness</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.awareness)}" style="width: ${escapeHtml(clampSkill(player.skills.awareness) * 10)}%"></span></div>
        </div>
        <div class="skill-row">
          <div class="skill-head">
            <span>Accuracy</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.accuracy)}" style="width: ${escapeHtml(clampSkill(player.skills.accuracy) * 10)}%"></span></div>
        </div>
        ${
          Number.isFinite(Number(player.skills.creativityWithSwears))
            ? `<div class="skill-row">
          <div class="skill-head">
            <span>Swears</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.skills.creativityWithSwears)}" style="width: ${escapeHtml(clampSkill(player.skills.creativityWithSwears) * 10)}%"></span></div>
        </div>`
            : ""
        }
        <div class="skill-row">
          <div class="skill-head">
            <span>Effort</span>
          </div>
          <div class="skill-track"><span class="skill-fill ${getSkillToneClass(player.effort, 0)}" style="width: ${escapeHtml(clampSkill(player.effort, 0) * 10)}%"></span></div>
        </div>
      </div>`
          : ""
      }
    </div>
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

    if (mode === "name-desc") {
      return b.name.localeCompare(a.name);
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

    if (mode === "overall-asc") {
      return a.score - b.score;
    }

    if (mode === "tier-asc") {
      const tierDiff =
        (tierSortOrder[a.tier?.code] ?? Number.MAX_SAFE_INTEGER) -
        (tierSortOrder[b.tier?.code] ?? Number.MAX_SAFE_INTEGER);

      return tierDiff || b.score - a.score || a.name.localeCompare(b.name);
    }

    if (mode === "tier-desc") {
      const tierDiff =
        (tierSortOrder[b.tier?.code] ?? Number.MAX_SAFE_INTEGER) -
        (tierSortOrder[a.tier?.code] ?? Number.MAX_SAFE_INTEGER);

      return tierDiff || b.score - a.score || a.name.localeCompare(b.name);
    }

    return a.defaultIndex - b.defaultIndex;
  });

  return sorted;
};

const updateCards = () => {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const mode = sortSelect?.value || "name-asc";

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

    const responseText = await response.text();
    const data = parsePlayersPayload(responseText);
    const sourcePlayers = Array.isArray(data?.players) ? data.players : [];

    players = applyTopPercentRanks(
      sourcePlayers
        .map((player, index) => normalizePlayer(player, index))
        .map((player, index) => ({
          ...player,
          score: computeOverallScore(player),
          tier: getTierInfoFromCode(player.tier) || getTierInfo(computeOverallScore(player)),
          defaultIndex: index,
          rarityClass: "",
        }))
        .map((player) => ({
          ...player,
          rarityClass: getRarityClass(player.score),
          searchText: buildSearchText(player),
        })),
    );

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
