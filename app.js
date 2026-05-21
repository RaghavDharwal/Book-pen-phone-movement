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

  const boardEl = document.getElementById("board");
  const moveDetailEl = document.getElementById("moveDetail");
  const stepCounterEl = document.getElementById("stepCounter");
  const stateLabelEl = document.getElementById("stateLabel");
  const minMovesEl = document.getElementById("minMoves");
  const speedInputEl = document.getElementById("speedInput");
  const speedValueEl = document.getElementById("speedValue");

  const resetBtn = document.getElementById("resetBtn");
  const prevBtn = document.getElementById("prevBtn");
  const stepBtn = document.getElementById("stepBtn");
  const autoBtn = document.getElementById("autoBtn");
  const exportAllPdfBtn = document.getElementById("exportAllPdfBtn");
  const exportCarsPdfBtn = document.getElementById("exportCarsPdfBtn");
  const exportBikesPdfBtn = document.getElementById("exportBikesPdfBtn");

  const slotEls = [];
  const tokenEls = new Map();

  let currentStep = 0;
  let moveSequence = [];
  let movementLog = [];
  let boardSnapshots = [];
  let autoplayTimer = null;

  function createSlots() {
    for (let index = 0; index < startState.length; index += 1) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.index = String(index);

      const holder = document.createElement("div");
      holder.className = "token-holder";

      const label = document.createElement("span");
      label.className = "book-label";
      label.textContent = `Book ${index + 1}`;

      slot.append(holder, label);
      boardEl.appendChild(slot);
      slotEls.push(slot);
    }
  }

  function createTokens() {
    for (let i = 0; i < STUDENTS_PER_SIDE; i += 1) {
      const carToken = document.createElement("span");
      carToken.className = "token car";
      carToken.textContent = CAR_NAMES[i];
      carToken.title = CAR_NAMES[i];
      tokenEls.set(`c${i + 1}`, carToken);

      const bikeToken = document.createElement("span");
      bikeToken.className = "token bike";
      bikeToken.textContent = BIKE_NAMES[i];
      bikeToken.title = BIKE_NAMES[i];
      tokenEls.set(`b${i + 1}`, bikeToken);
    }
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
    const temp = chars[from];
    chars[from] = chars[to];
    chars[to] = temp;
    return chars.join("");
  }

  function getValidMoves(state) {
    const moves = [];

    for (let i = 0; i < state.length; i += 1) {
      const token = state[i];

      if (token === CAR) {
        if (i + 1 < state.length && state[i + 1] === EMPTY) {
          moves.push({
            state: swapChars(state, i, i + 1),
            from: i,
            to: i + 1,
            token: CAR,
            type: "slide",
          });
        }

        if (i + 2 < state.length && state[i + 1] === BIKE && state[i + 2] === EMPTY) {
          moves.push({
            state: swapChars(state, i, i + 2),
            from: i,
            to: i + 2,
            token: CAR,
            type: "exchange",
          });
        }
      }

      if (token === BIKE) {
        if (i - 1 >= 0 && state[i - 1] === EMPTY) {
          moves.push({
            state: swapChars(state, i, i - 1),
            from: i,
            to: i - 1,
            token: BIKE,
            type: "slide",
          });
        }

        if (i - 2 >= 0 && state[i - 1] === CAR && state[i - 2] === EMPTY) {
          moves.push({
            state: swapChars(state, i, i - 2),
            from: i,
            to: i - 2,
            token: BIKE,
            type: "exchange",
          });
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

      const nextMoves = getValidMoves(state);
      for (const move of nextMoves) {
        if (!visited.has(move.state)) {
          visited.add(move.state);
          parent.set(move.state, state);
          moveFromParent.set(move.state, move);
          queue.push(move.state);
        }
      }
    }

    if (!visited.has(goal)) {
      return { moves: [], states: [] };
    }

    const states = [];
    const moves = [];
    let pointer = goal;

    while (pointer !== start) {
      states.push(pointer);
      moves.push(moveFromParent.get(pointer));
      pointer = parent.get(pointer);
    }

    states.push(start);
    states.reverse();
    moves.reverse();

    return { moves, states };
  }

  function buildBoardSnapshots(moves) {
    const snapshots = [buildInitialBoard()];

    for (const move of moves) {
      const prev = snapshots[snapshots.length - 1].slice();
      const movingToken = prev[move.from];
      prev[move.from] = null;
      prev[move.to] = movingToken;
      snapshots.push(prev);
    }

    return snapshots;
  }

  function speedMs() {
    return Number(speedInputEl.value);
  }

  function tokenNameFromId(tokenId) {
    if (!tokenId) {
      return "Unknown";
    }

    const index = Number(tokenId.slice(1)) - 1;
    if (tokenId.startsWith("c")) {
      return CAR_NAMES[index] ?? "Unknown";
    }

    if (tokenId.startsWith("b")) {
      return BIKE_NAMES[index] ?? "Unknown";
    }

    return "Unknown";
  }

  function compactVehicleName(name, maxChars = 8) {
    if (name.length <= maxChars) {
      return name;
    }

    return `${name.slice(0, maxChars - 1)}.`;
  }

  function drawMovementArrow(doc, startX, startY, endX, endY, rgb, arrowSize = 5) {
    const [r, g, b] = rgb;
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.3);
    doc.line(startX, startY, endX, endY);

    const angle = Math.atan2(endY - startY, endX - startX);
    const leftX = endX - arrowSize * Math.cos(angle - Math.PI / 8);
    const leftY = endY - arrowSize * Math.sin(angle - Math.PI / 8);
    const rightX = endX - arrowSize * Math.cos(angle + Math.PI / 8);
    const rightY = endY - arrowSize * Math.sin(angle + Math.PI / 8);

    doc.line(endX, endY, leftX, leftY);
    doc.line(endX, endY, rightX, rightY);

    doc.setLineWidth(0.6);
    doc.setDrawColor(80, 80, 80);
  }

  function drawPdfStateBoard(doc, { x, y, width, snapshot, moveArrow = null, slotHeight = 44 }) {
    const slotCount = snapshot.length;
    const gap = 1.6;
    const slotWidth = (width - gap * (slotCount - 1)) / slotCount;
    const boardY = y;

    doc.setLineWidth(0.55);
    doc.setDrawColor(195, 183, 156);

    for (let index = 0; index < slotCount; index += 1) {
      const slotX = x + index * (slotWidth + gap);
      const tokenId = snapshot[index];

      doc.setFillColor(246, 236, 220);
      doc.roundedRect(slotX, boardY, slotWidth, slotHeight, 2.5, 2.5, "FD");

      doc.setLineDashPattern([1, 1], 0);
      doc.setDrawColor(182, 167, 137);
      doc.line(slotX + 2, boardY + slotHeight * 0.52, slotX + slotWidth - 2, boardY + slotHeight * 0.52);
      doc.setLineDashPattern([], 0);

      if (tokenId) {
        const isCar = tokenId.startsWith("c");
        const tokenX = slotX + 1.1;
        const tokenWidth = slotWidth - 2.2;
        const tokenHeight = Math.max(7, Math.min(10, slotHeight * 0.24));
        const tokenY = isCar ? boardY + 4.3 : boardY + slotHeight - tokenHeight - 4.3;

        if (isCar) {
          doc.setFillColor(24, 125, 109);
          doc.setDrawColor(17, 91, 82);
        } else {
          doc.setFillColor(206, 82, 41);
          doc.setDrawColor(141, 47, 20);
        }

        doc.roundedRect(tokenX, tokenY, tokenWidth, tokenHeight, 6, 6, "FD");

        const fullName = tokenNameFromId(tokenId);
        const label = tokenId.toUpperCase();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.4);
        doc.setTextColor(248, 252, 252);
        const textWidth = doc.getTextWidth(label);
        doc.text(label, tokenX + (tokenWidth - textWidth) / 2, tokenY + tokenHeight * 0.68);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(3.6);
      doc.setTextColor(94, 86, 67);
      const bookLabel = String(index + 1);
      const labelWidth = doc.getTextWidth(bookLabel);
      doc.text(bookLabel, slotX + (slotWidth - labelWidth) / 2, boardY + slotHeight - 1.4);
    }

    if (moveArrow) {
      const fromIndex = moveArrow.fromBook - 1;
      const toIndex = moveArrow.toBook - 1;
      const laneY =
        moveArrow.tokenType === CAR ? boardY + 12.5 : boardY + slotHeight - 12.5;
      const startX = x + fromIndex * (slotWidth + gap) + slotWidth / 2;
      const endX = x + toIndex * (slotWidth + gap) + slotWidth / 2;
      const arrowColor = moveArrow.tokenType === CAR ? [20, 116, 100] : [194, 72, 31];

      drawMovementArrow(doc, startX, laneY, endX, laneY, arrowColor, 3.8);

      const actionLabel = moveArrow.moveType === "slide" ? "slide" : "jump";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.9);
      doc.setTextColor(58, 69, 69);
      const actionX = Math.min(startX, endX) + Math.abs(endX - startX) / 2 - doc.getTextWidth(actionLabel) / 2;
      const actionY = moveArrow.tokenType === CAR ? laneY - 2.3 : laneY + 5.4;
      doc.text(actionLabel, actionX, actionY);
    }

    doc.setTextColor(31, 47, 47);
    return {
      height: slotHeight,
    };
  }

  function drawPdfMoveCard(doc, { x, y, width, height, entry }) {
    doc.setFillColor(255, 252, 246);
    doc.setDrawColor(211, 201, 183);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, width, height, 4, 4, "FD");

    const actionWord = entry.moveType === "slide" ? "slide" : "jump";
    const title = `#${entry.step} ${entry.tokenType} ${compactVehicleName(entry.tokenName, 10)} ${entry.fromBook}->${entry.toBook}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.1);
    doc.setTextColor(34, 56, 56);
    doc.text(title, x + 6, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text(actionWord, x + width - 23, y + 10);

    const boardInset = 6;
    const boardY = y + 13;
    const boardHeight = Math.max(38, height - 18);

    drawPdfStateBoard(doc, {
      x: x + boardInset,
      y: boardY,
      width: width - boardInset * 2,
      snapshot: entry.beforeSnapshot,
      moveArrow: {
        tokenType: entry.tokenType,
        moveType: entry.moveType,
        fromBook: entry.fromBook,
        toBook: entry.toBook,
      },
      slotHeight: boardHeight,
    });
  }

  function buildMovementLog(moves, snapshots) {
    const logs = [];

    for (let i = 0; i < moves.length; i += 1) {
      const move = moves[i];
      const before = snapshots[i];
      const tokenId = before[move.from];
      const tokenType = move.token === CAR ? "CAR" : "BIKE";

      logs.push({
        step: i + 1,
        tokenType,
        tokenId,
        tokenName: tokenNameFromId(tokenId),
        moveType: move.type,
        fromBook: move.from + 1,
        toBook: move.to + 1,
        beforeSnapshot: before.slice(),
        afterSnapshot: snapshots[i + 1].slice(),
      });
    }

    return logs;
  }

  function describeMove(logEntry) {
    const action = logEntry.moveType === "slide" ? "slides" : "exchange-jumps";
    return `Move ${logEntry.step}: ${logEntry.tokenType} ${logEntry.tokenName} ${action} from Book ${logEntry.fromBook} to Book ${logEntry.toBook}.`;
  }

  function exportMovementPdf(scope) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      window.alert("PDF library is not loaded. Please refresh and try again.");
      return;
    }

    const scopeTitle =
      scope === "CAR" ? "Car Movements" : scope === "BIKE" ? "Bike Movements" : "All Movements";

    const fileName =
      scope === "CAR"
        ? "book-swap-car-movements.pdf"
        : scope === "BIKE"
          ? "book-swap-bike-movements.pdf"
          : "book-swap-all-movements.pdf";

    const selectedMoves =
      scope === "ALL" ? movementLog : movementLog.filter((entry) => entry.tokenType === scope);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const sidePadding = 18;
    const topPadding = 18;
    const bottomPadding = 18;
    const headerHeight = 26;
    const contentWidth = pageWidth - sidePadding * 2;

    const columns = 2;
    const rows = 8;
    const movesPerPage = columns * rows;
    const colGap = 10;
    const rowGap = 6;

    const cardWidth = (contentWidth - colGap) / columns;
    const cardHeight =
      (pageHeight - topPadding - bottomPadding - headerHeight - rowGap * (rows - 1)) / rows;

    const pageCount = Math.max(1, Math.ceil(selectedMoves.length / movesPerPage));

    const drawPageHeader = (pageNumber, startIndex, endIndex) => {
      const headerY = topPadding;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(27, 51, 51);
      doc.text(`Book Swap Visual Moves (${scopeTitle})`, sidePadding, headerY + 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      doc.text(
        `A4 PDF | Page ${pageNumber} / ${pageCount} | Moves ${startIndex}-${endIndex} of ${selectedMoves.length}`,
        sidePadding,
        headerY + 20,
      );

      doc.setDrawColor(208, 200, 183);
      doc.setLineWidth(0.6);
      doc.line(sidePadding, headerY + headerHeight, sidePadding + contentWidth, headerY + headerHeight);
    };

    if (selectedMoves.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(52, 63, 63);
      doc.text("No movement entries found for this filter.", sidePadding, 46);
      doc.save(fileName);
      return;
    }

    for (let page = 0; page < pageCount; page += 1) {
      if (page > 0) {
        doc.addPage();
      }

      const start = page * movesPerPage;
      const endExclusive = Math.min(start + movesPerPage, selectedMoves.length);
      drawPageHeader(page + 1, start + 1, endExclusive);

      for (let i = start; i < endExclusive; i += 1) {
        const indexInPage = i - start;
        const row = Math.floor(indexInPage / columns);
        const col = indexInPage % columns;

        const x = sidePadding + col * (cardWidth + colGap);
        const y = topPadding + headerHeight + row * (cardHeight + rowGap);

        drawPdfMoveCard(doc, {
          x,
          y,
          width: cardWidth,
          height: cardHeight,
          entry: selectedMoves[i],
        });
      }
    }

    doc.save(fileName);
  }

  function stopAutoplay() {
    if (autoplayTimer !== null) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function updateStatus() {
    stepCounterEl.textContent = `${currentStep} / ${moveSequence.length}`;

    if (currentStep === 0) {
      stateLabelEl.textContent = "Start";
      moveDetailEl.textContent = "Initial position loaded. Use Next Step or Auto Play.";
    } else if (currentStep === moveSequence.length) {
      stateLabelEl.textContent = "Solved";
      moveDetailEl.textContent = "Goal reached: bike side and car side have been swapped.";
    } else {
      stateLabelEl.textContent = "In Progress";
      moveDetailEl.textContent = describeMove(movementLog[currentStep - 1]);
    }

    prevBtn.disabled = currentStep === 0;
    stepBtn.disabled = currentStep === moveSequence.length;
    autoBtn.textContent = autoplayTimer === null ? "Auto Play" : "Pause";
  }

  function animateTokenTransitions(firstRects) {
    for (const tokenEl of tokenEls.values()) {
      const first = firstRects.get(tokenEl);
      if (!first) {
        continue;
      }

      const last = tokenEl.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;

      if (dx !== 0 || dy !== 0) {
        tokenEl.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: "translate(0, 0)" },
          ],
          {
            duration: Math.max(200, speedMs()),
            easing: "cubic-bezier(0.2, 0.9, 0.24, 1)",
          },
        );
      }
    }
  }

  function renderStep(step, animate = true) {
    const board = boardSnapshots[step];

    const firstRects = new Map();
    if (animate) {
      for (const tokenEl of tokenEls.values()) {
        firstRects.set(tokenEl, tokenEl.getBoundingClientRect());
      }
    }

    for (let index = 0; index < slotEls.length; index += 1) {
      const slot = slotEls[index];
      const holder = slot.firstElementChild;
      holder.textContent = "";

      const tokenId = board[index];
      if (tokenId) {
        holder.appendChild(tokenEls.get(tokenId));
        slot.classList.remove("empty-slot");
      } else {
        slot.classList.add("empty-slot");
      }
    }

    if (animate) {
      animateTokenTransitions(firstRects);
    }

    updateStatus();
  }

  function autoAdvance() {
    if (currentStep >= moveSequence.length) {
      stopAutoplay();
      updateStatus();
      return;
    }

    currentStep += 1;
    renderStep(currentStep, true);

    if (currentStep >= moveSequence.length) {
      stopAutoplay();
      updateStatus();
      return;
    }

    autoplayTimer = setTimeout(autoAdvance, speedMs() + 30);
  }

  function setupEvents() {
    resetBtn.addEventListener("click", () => {
      stopAutoplay();
      currentStep = 0;
      renderStep(currentStep, false);
    });

    prevBtn.addEventListener("click", () => {
      stopAutoplay();
      if (currentStep > 0) {
        currentStep -= 1;
        renderStep(currentStep, true);
      }
    });

    stepBtn.addEventListener("click", () => {
      stopAutoplay();
      if (currentStep < moveSequence.length) {
        currentStep += 1;
        renderStep(currentStep, true);
      }
    });

    autoBtn.addEventListener("click", () => {
      if (autoplayTimer !== null) {
        stopAutoplay();
        updateStatus();
        return;
      }

      autoplayTimer = setTimeout(autoAdvance, speedMs());
      updateStatus();
    });

    speedInputEl.addEventListener("input", () => {
      speedValueEl.textContent = `${speedMs()} ms`;
    });

    exportAllPdfBtn.addEventListener("click", () => {
      exportMovementPdf("ALL");
    });

    exportCarsPdfBtn.addEventListener("click", () => {
      exportMovementPdf("CAR");
    });

    exportBikesPdfBtn.addEventListener("click", () => {
      exportMovementPdf("BIKE");
    });
  }

  function init() {
    createSlots();
    createTokens();

    const solution = solvePuzzleBfs(startState, goalState);
    moveSequence = solution.moves;
    boardSnapshots = buildBoardSnapshots(moveSequence);
    movementLog = buildMovementLog(moveSequence, boardSnapshots);

    minMovesEl.textContent = String(moveSequence.length);
    speedValueEl.textContent = `${speedMs()} ms`;

    if (moveSequence.length === 0) {
      moveDetailEl.textContent = "No valid solution found for the current puzzle setup.";
    }

    setupEvents();
    renderStep(0, false);
  }

  init();
})();
