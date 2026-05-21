(() => {
  const STUDENTS_PER_SIDE = 8;
  const CAR = "C";
  const BIKE = "B";
  const EMPTY = "_";

  const CAR_NAMES = [
    "Creta",
    "Scorpio",
    "Fortuner",
    "Innova",
    "Swift",
    "Virtus",
    "Hector",
    "Verna",
  ];

  const BIKE_NAMES = [
    "S1000 RR",
    "Z900",
    "ZX10R",
    "R1200 GS",
    "R1",
    "Rocket",
    "Hayabusa",
    "Busa",
  ];

  const startState = CAR.repeat(STUDENTS_PER_SIDE) + EMPTY + BIKE.repeat(STUDENTS_PER_SIDE);
  const goalState = BIKE.repeat(STUDENTS_PER_SIDE) + EMPTY + CAR.repeat(STUDENTS_PER_SIDE);

  const boardEl = document.getElementById("practiceBoard");
  const stepValueEl = document.getElementById("stepValue");
  const stateValueEl = document.getElementById("stateValue");
  const popupEl = document.getElementById("popup");
  const resetBtn = document.getElementById("resetBtn");

  let board = [];
  let expectedMoves = [];
  let currentStep = 0;
  let draggedFrom = null;
  let interactionLocked = false;

  function tokenNameFromId(tokenId) {
    if (!tokenId) {
      return "Unknown";
    }

    const idx = Number(tokenId.slice(1)) - 1;
    if (tokenId.startsWith("c")) {
      return CAR_NAMES[idx] ?? "Unknown";
    }
    if (tokenId.startsWith("b")) {
      return BIKE_NAMES[idx] ?? "Unknown";
    }

    return "Unknown";
  }

  function buildInitialBoard() {
    const initial = [];
    for (let i = 1; i <= STUDENTS_PER_SIDE; i += 1) {
      initial.push(`c${i}`);
    }
    initial.push(null);
    for (let i = 1; i <= STUDENTS_PER_SIDE; i += 1) {
      initial.push(`b${i}`);
    }
    return initial;
  }

  function swapChars(state, from, to) {
    const chars = state.split("");
    const tmp = chars[from];
    chars[from] = chars[to];
    chars[to] = tmp;
    return chars.join("");
  }

  function getValidMoves(state) {
    const moves = [];

    for (let i = 0; i < state.length; i += 1) {
      const token = state[i];

      if (token === CAR) {
        if (i + 1 < state.length && state[i + 1] === EMPTY) {
          moves.push({ state: swapChars(state, i, i + 1), from: i, to: i + 1, token: CAR, type: "slide" });
        }

        if (i + 2 < state.length && state[i + 1] === BIKE && state[i + 2] === EMPTY) {
          moves.push({ state: swapChars(state, i, i + 2), from: i, to: i + 2, token: CAR, type: "exchange" });
        }
      }

      if (token === BIKE) {
        if (i - 1 >= 0 && state[i - 1] === EMPTY) {
          moves.push({ state: swapChars(state, i, i - 1), from: i, to: i - 1, token: BIKE, type: "slide" });
        }

        if (i - 2 >= 0 && state[i - 1] === CAR && state[i - 2] === EMPTY) {
          moves.push({ state: swapChars(state, i, i - 2), from: i, to: i - 2, token: BIKE, type: "exchange" });
        }
      }
    }

    return moves;
  }

  function solvePuzzleBfs(start, goal) {
    const queue = [start];
    const visited = new Set([start]);
    const parent = new Map([[start, null]]);
    const moveFromParent = new Map();
    let head = 0;

    while (head < queue.length) {
      const state = queue[head];
      head += 1;

      if (state === goal) {
        break;
      }

      const moves = getValidMoves(state);
      for (const move of moves) {
        if (!visited.has(move.state)) {
          visited.add(move.state);
          parent.set(move.state, state);
          moveFromParent.set(move.state, move);
          queue.push(move.state);
        }
      }
    }

    if (!visited.has(goal)) {
      return [];
    }

    const outputMoves = [];
    let pointer = goal;
    while (pointer !== start) {
      outputMoves.push(moveFromParent.get(pointer));
      pointer = parent.get(pointer);
    }

    outputMoves.reverse();
    return outputMoves;
  }

  function buildExpectedMovesWithIds(abstractMoves) {
    const working = buildInitialBoard();
    const output = [];

    for (const move of abstractMoves) {
      const tokenId = working[move.from];
      output.push({
        from: move.from,
        to: move.to,
        tokenId,
        tokenType: tokenId.startsWith("c") ? "CAR" : "BIKE",
      });

      working[move.to] = tokenId;
      working[move.from] = null;
    }

    return output;
  }

  function isRuleValidMove(from, to, tokenId) {
    if (!tokenId || board[to] !== null) {
      return false;
    }

    const isCar = tokenId.startsWith("c");
    const isBike = tokenId.startsWith("b");

    if (isCar) {
      if (to === from + 1) {
        return true;
      }
      if (to === from + 2 && board[from + 1]?.startsWith("b")) {
        return true;
      }
      return false;
    }

    if (isBike) {
      if (to === from - 1) {
        return true;
      }
      if (to === from - 2 && board[from - 1]?.startsWith("c")) {
        return true;
      }
      return false;
    }

    return false;
  }

  function showPopup(message) {
    popupEl.textContent = message;
    popupEl.classList.add("show");
  }

  function hidePopup() {
    popupEl.classList.remove("show");
  }

  function loseAndReset(reason) {
    interactionLocked = true;
    showPopup(`You lost! ${reason}. Resetting...`);

    setTimeout(() => {
      resetGame();
      hidePopup();
      interactionLocked = false;
    }, 1200);
  }

  function winAndReset() {
    interactionLocked = true;
    showPopup("Perfect! You completed all moves. Resetting for practice.");

    setTimeout(() => {
      resetGame();
      hidePopup();
      interactionLocked = false;
    }, 1400);
  }

  function updateStatus() {
    stepValueEl.textContent = `${currentStep} / ${expectedMoves.length}`;

    if (currentStep === 0) {
      stateValueEl.textContent = "Start";
      return;
    }

    if (currentStep >= expectedMoves.length) {
      stateValueEl.textContent = "Solved";
      return;
    }

    stateValueEl.textContent = "In Progress";
  }

  function onDragStart(event) {
    if (interactionLocked) {
      event.preventDefault();
      return;
    }

    const fromIndex = Number(event.target.dataset.index);
    if (Number.isNaN(fromIndex)) {
      event.preventDefault();
      return;
    }

    draggedFrom = fromIndex;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(fromIndex));
  }

  function onDragOver(event) {
    if (interactionLocked) {
      return;
    }

    const toIndex = Number(event.currentTarget.dataset.index);
    if (board[toIndex] === null) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  }

  function applyMove(from, to) {
    const tokenId = board[from];
    board[to] = tokenId;
    board[from] = null;
    currentStep += 1;
    renderBoard();

    if (currentStep >= expectedMoves.length) {
      winAndReset();
    }
  }

  function onDrop(event) {
    event.preventDefault();

    if (interactionLocked) {
      return;
    }

    const toIndex = Number(event.currentTarget.dataset.index);
    const fromRaw = event.dataTransfer.getData("text/plain");
    const fromIndex = fromRaw ? Number(fromRaw) : draggedFrom;

    draggedFrom = null;

    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex === toIndex) {
      return;
    }

    const tokenId = board[fromIndex];
    if (!isRuleValidMove(fromIndex, toIndex, tokenId)) {
      loseAndReset("Invalid move by puzzle rules");
      return;
    }

    const expected = expectedMoves[currentStep];
    if (!expected) {
      loseAndReset("Unexpected move state");
      return;
    }

    if (expected.from !== fromIndex || expected.to !== toIndex || expected.tokenId !== tokenId) {
      const expectedName = tokenNameFromId(expected.tokenId);
      loseAndReset(`Expected ${expectedName} from Book ${expected.from + 1} to Book ${expected.to + 1}`);
      return;
    }

    applyMove(fromIndex, toIndex);
  }

  function createSlot(index) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.index = String(index);

    const holder = document.createElement("div");
    holder.className = "token-holder";

    const label = document.createElement("span");
    label.className = "book-label";
    label.textContent = `Book ${index + 1}`;

    slot.append(holder, label);

    slot.addEventListener("dragover", onDragOver);
    slot.addEventListener("drop", onDrop);

    return slot;
  }

  function createToken(tokenId, index) {
    const token = document.createElement("span");
    token.className = `token ${tokenId.startsWith("c") ? "car" : "bike"}`;
    token.textContent = tokenNameFromId(tokenId);
    token.title = tokenNameFromId(tokenId);
    token.draggable = true;
    token.dataset.index = String(index);
    token.addEventListener("dragstart", onDragStart);
    return token;
  }

  function renderBoard() {
    boardEl.textContent = "";

    for (let i = 0; i < board.length; i += 1) {
      const slot = createSlot(i);
      const holder = slot.firstElementChild;
      const tokenId = board[i];

      if (tokenId) {
        holder.appendChild(createToken(tokenId, i));
      } else {
        slot.classList.add("empty");
      }

      boardEl.appendChild(slot);
    }

    updateStatus();
  }

  function resetGame() {
    currentStep = 0;
    draggedFrom = null;
    board = buildInitialBoard();
    renderBoard();
  }

  function init() {
    const abstractMoves = solvePuzzleBfs(startState, goalState);
    expectedMoves = buildExpectedMovesWithIds(abstractMoves);

    resetBtn.addEventListener("click", () => {
      hidePopup();
      interactionLocked = false;
      resetGame();
    });

    resetGame();
  }

  init();
})();
