"use strict";

(function() {
    const CLASS_DESKTOP = "desktop",
        CLASS_OFF = "off",
        CLASS_OPEN = "open",
        CLASS_SELECTED = "selected",
        CLASS_BOARD = "board",
        CLASS_SPACE = "space",
        CLASS_SPACE_BOARD = "spaceBoard",
        CLASS_DONE = "done",
        CLASS_X = "x",
        CLASS_O = "o",
        CLASS_BLINK = "blink",
        CLASS_FADE = "fade",
        CLASS_WINS = "wins",
        CLASS_TIES = "ties",
        CLASS_PLAYER = "player",
        CLASS_COMPUTER = "computer",
        CLASS_COVER_UP = "coverUp",
        CLASS_PIECES = "pieces",
        CLASS_PIECE = "piece",
        CLASS_HIDDEN= "hidden",
        ID_PLAYER_O = "playerO",
        ID_PLAYER_X = "playerX",
        EL_APP_CONTAINER = document.getElementById("APP_CONTAINER");

    window.onload = () => App.init();

    class App {
        static init() {
            App._startDesktopModeIfNecessary();

            Listener.init();

            Vibration.init();

            Music.init();
        
            Game.Score.init();

            App._lockOrientation();
        
            App._startGameFromHash();

            App._startServiceWorker();
        }

        static _startDesktopModeIfNecessary() {
            if(Utils.isDesktop()) {
                EL_APP_CONTAINER.classList.add(CLASS_DESKTOP);
            }
        }

        static _lockOrientation() {
            try {
                window.screen.orientation.lock("portrait");
            } catch(ignore) {}
        };

        static _startGameFromHash() {
            if(window.location.hash) {
                Game.play(window.location.hash.replace("#", ""));
            } else {
                Game.play();
            }
        }

        static _startServiceWorker() {
            if("serviceWorker" in navigator) {
                navigator.serviceWorker.register("sw.js");
            }
        }
    }

    class Listener {
        static init() {
            window.addEventListener("orientationchange", () => {
                if(!Utils.isDesktop()) {
                    if(screen.orientation.angle === 0) {
                        EL_APP_CONTAINER.classList.remove(CLASS_DESKTOP);
                    } else {
                        EL_APP_CONTAINER.classList.add(CLASS_DESKTOP);
                    }
                }
            })

            window.addEventListener("mousedown", Music.firstTouch);

            Menu.EL_BTN.addEventListener("click", () => {
                Utils.clickEffect();
                Menu.toggle();
            });

            Menu.EL_LIST_ITEM_GAMES.forEach((el) => {
                el.addEventListener("click", (ev) => {
                    Game.removeAll();

                    Menu.listGameItemClicked(ev);
                });
            });

            Vibration.EL_BTN.addEventListener("click", () => {
                Vibration.toggle();
                Utils.clickEffect();
            });

            Music.EL_BTN.addEventListener("click", () => {
                Music.toggle();
                Utils.clickEffect();
            });

            Sound.EL_BTN.addEventListener("click", () => {
                Sound.toggle();
                Utils.clickEffect();
            });

            Game.Score.EL_BTN.addEventListener("click", () => {
                Game.Score.toggle();
                Utils.clickEffect();
            });

            Game.Other.EL_BUTTON_C_S.addEventListener("click", () => {
                Game.Other.gameCustomSizeSet();
                Utils.clickEffect();
            });

            Game.Other.EL_INPUT_C_S.addEventListener("keyup", (e) => {
                if(e.key === "Enter" || e.keyCode === 13) {
                    Game.Other.gameCustomSizeSet();
                }
            });
        }
    }

    class Game {
        static #STORAGE_LAST_PLAYED = "TTC_last";

        static #CURRENT_GAME_ID;

        static #PLAYER_X = 1;
        static #PLAYER_O = 2;

        static #PLAYER_PLAYING = Game.#PLAYER_X;

        static #IS_GAME_OVER = false;
        static #IS_GAME_OVER_ON_BOARD = [];

        static play(gameId) {
            if(!gameId) {
                gameId = localStorage.getItem(this.#STORAGE_LAST_PLAYED) || Game.ThreeOnly.ID_P_P;
            }

            switch(gameId) {
                case Game.Classic.ID_P_P:
                    Game.Classic.gamePlayerVsPlayer();
                    break;

                case Game.Classic.ID_P_C:
                    Game.Classic.gamePlayerVsComputer();
                    break;

                case Game.ThreeOnly.ID_THR_B:
                    Game.ThreeOnly.gameBasic();
                    break;

                case Game.ThreeOnly.ID_THR_Q:
                    Game.ThreeOnly.gameQuick();
                    break;

                case Game.ThreeOnly.ID_THR_L_M:
                    Game.ThreeOnly.gameLimitedMoves();
                    break;

                case Game.Other.ID_OTH_C_S:
                    Game.Other.gameCustomSize();
                    break;

                case Game.Other.ID_OTH_I_O:
                    Game.Other.gameInsideOut();
                    break;

                case Game.Other.ID_OTH_C_U:
                    Game.Other.gameCoverUp();
                    break;

                default:
                    Game.Classic.gamePlayerVsPlayer();
                    gameId = Game.ThreeOnly.ID_P_P;
                    break;
            }

            Menu.listGameSelect(gameId);

            localStorage.setItem(Game.#STORAGE_LAST_PLAYED, gameId);

            history.replaceState(undefined, undefined, "#" + gameId);

            Game.#CURRENT_GAME_ID = gameId;
        }

        static nextPlayer() {
            Game.#PLAYER_PLAYING = Game.#PLAYER_PLAYING === Game.#PLAYER_X ? Game.#PLAYER_O : Game.#PLAYER_X;

            Game.Score.showPlayerTurn();
        }

        static removeAll() {
            Game.Board.remove();
            Game.Score.remove();

            clearInterval(Game.ThreeOnly.TIME_INTERNVAL);

            Game.Score.EL_TOP.classList.remove(CLASS_COMPUTER);
        }

        static reset() {
            Game.#PLAYER_PLAYING = Game.#PLAYER_X;
            Game.#IS_GAME_OVER = false;

            Game.#IS_GAME_OVER_ON_BOARD = [];
        }

        static Score = class {
            static EL_BTN = document.getElementById("BTN_SCORE");

            static EL_TOP = document.getElementById("TOP");
            static #EL_BOTTOM = document.getElementById("BOTTOM");

            static #STORAGE_KEY = "TTC_score";

            static #SHOWING = true;

            static X_WINS = 0;
            static O_WINS = 0;
            static TIES = 0;

            static init() {
                Game.Score.#SHOWING = (localStorage.getItem(Game.Score.#STORAGE_KEY) || "true") === "true" || Utils.isDesktop();

                if(Game.Score.#SHOWING) {
                    Game.Score.EL_TOP.style.opacity = 1;
                    Game.Score.#EL_BOTTOM.style.opacity = 1;
                } else {
                    Game.Score.EL_BTN.classList.add(CLASS_OFF);

                    Game.Score.EL_TOP.style.opacity = 0;
                    Game.Score.#EL_BOTTOM.style.opacity = 0;
                }
            }

            static toggle() {
                const b = !((localStorage.getItem(Game.Score.#STORAGE_KEY) || "true") === "true");

                Game.Score.#SHOWING = b;

                localStorage.setItem(Game.Score.#STORAGE_KEY, b);

                if(Game.Score.#SHOWING) {
                    Game.Score.EL_BTN.classList.remove(CLASS_OFF);

                    Game.Score.EL_TOP.style.opacity = 1;
                    Game.Score.#EL_BOTTOM.style.opacity = 1;

                    if(Game.#CURRENT_GAME_ID === Game.Other.ID_OTH_C_U) {
                        Game.Score.EL_TOP.querySelector(".container").style.opacity = 1;
                        Game.Score.#EL_BOTTOM.querySelector(".container").style.opacity = 1;
                    }
                } else {
                    Game.Score.EL_BTN.classList.add(CLASS_OFF);

                    Game.Score.EL_TOP.style.opacity = 0;
                    Game.Score.#EL_BOTTOM.style.opacity = 0;

                    if(Game.#CURRENT_GAME_ID === Game.Other.ID_OTH_C_U) {
                        Game.Score.EL_TOP.querySelector(".container").style.opacity = 0;
                        Game.Score.#EL_BOTTOM.querySelector(".container").style.opacity = 0;
                    }
                }
            }

            static reset() {
                Game.Score.X_WINS = 0;
                Game.Score.O_WINS = 0;
                Game.Score.TIES = 0

                Game.Score.showScore();
                Game.Score.showPlayerTurn();
            }

            static remove() {
                Game.Score.X_WINS = 0;
                Game.Score.O_WINS = 0;
                Game.Score.TIES = 0;

                Game.Score.EL_TOP.innerHTML = "";
                Game.Score.#EL_BOTTOM.innerHTML = "";

                Game.Score.EL_TOP.classList.remove(CLASS_COVER_UP);
                Game.Score.#EL_BOTTOM.classList.remove(CLASS_COVER_UP);
            }

            static generateBasicScore() {
                Game.Score.remove();

                Game.Score.EL_TOP.appendChild(Game.Score._basicScoreUI(ID_PLAYER_O, Game.Score.O_WINS));
                Game.Score.#EL_BOTTOM.appendChild(Game.Score._basicScoreUI(ID_PLAYER_X, Game.Score.X_WINS));

                Game.Score.showPlayerTurn();
            }

            static generateCoverUpPieces() {
                Game.Score.generateBasicScore();

                Game.Score.EL_TOP.classList.add(CLASS_COVER_UP);
                Game.Score.#EL_BOTTOM.classList.add(CLASS_COVER_UP);

                Game.Score.EL_TOP.appendChild(Game.Score._piecesUI(ID_PLAYER_O));
                Game.Score.#EL_BOTTOM.appendChild(Game.Score._piecesUI(ID_PLAYER_X));

                if(!Game.Score.#SHOWING) {
                    Game.Score.EL_TOP.querySelector(".container").style.opacity = 0;
                    Game.Score.#EL_BOTTOM.querySelector(".container").style.opacity = 0;
                }
            }

            static _basicScoreUI(id, score) {
                const container = document.createElement("div");
                    container.className = "container";

                const player = document.createElement("div");
                    player.className = CLASS_PLAYER;
                    player.id = id;

                const center = document.createElement("div");

                const wins = document.createElement("div");
                    wins.className = CLASS_WINS;
                    wins.innerHTML = score;

                const ties = document.createElement("div");
                    ties.className = CLASS_TIES;
                    ties.innerHTML = Game.Score.TIES;

                center.appendChild(wins);
                center.appendChild(ties);

                container.appendChild(player);
                container.appendChild(center);

                return container;
            }

            static _piecesUI(id) {
                const xo = id === ID_PLAYER_X ? CLASS_X : CLASS_O,
                    player = id === ID_PLAYER_X ? Game.#PLAYER_X : Game.#PLAYER_O;

                const container = document.createElement("div");
                    container.classList.add(CLASS_PIECES);
                    container.classList.add(xo);

                if(Utils.isDesktop()) {
                    for(let i = 3; i > 0; i--) {
                        for(let j = 0; j < 2; j++) {
                            const piece = document.createElement("div");
                                piece.classList.add(CLASS_PIECE);
                                piece.classList.add(CLASS_PIECE + i);
                                piece.dataset.weight = i;
                                piece.addEventListener("click", () => {
                                    if(Game.#PLAYER_PLAYING === player && !piece.classList.contains(CLASS_HIDDEN)) {
                                        Vibration.click();
                                    
                                        document.querySelectorAll("." + CLASS_PIECES + "." + xo + " ." + CLASS_SELECTED).forEach((p) => {
                                            p.classList.remove(CLASS_SELECTED);
                                        });

                                        piece.classList.add(CLASS_SELECTED);

                                        Game.Board.PIECE_SELECTED = piece;
                                    }  
                                });

                            container.appendChild(piece);
                        }
                    }
                } else {
                    for(let j = 0; j < 2; j++) {
                        for(let i = 1; i < 4; i++) {
                            const piece = document.createElement("div");
                                piece.classList.add(CLASS_PIECE);
                                piece.classList.add(CLASS_PIECE + i);
                                piece.dataset.weight = i;
                                piece.addEventListener("click", () => {
                                        if(Game.#PLAYER_PLAYING === player && !piece.classList.contains(CLASS_HIDDEN)) {
                                            Vibration.click();
                                        
                                            document.querySelectorAll("." + CLASS_PIECES + "." + xo + " ." + CLASS_SELECTED).forEach((p) => {
                                                p.classList.remove(CLASS_SELECTED);
                                            });

                                            piece.classList.add(CLASS_SELECTED);

                                            Game.Board.PIECE_SELECTED = piece;
                                        }  
                                });
            
                            container.appendChild(piece);
                        }
                    }
                }

                return container;
            }

            static showScore() {
                try {
                    document.getElementById(ID_PLAYER_X).parentElement.querySelector("." + CLASS_WINS).innerHTML = Game.Score.X_WINS;
                    document.getElementById(ID_PLAYER_X).parentElement.querySelector("." + CLASS_TIES).innerHTML = Game.Score.TIES;

                    document.getElementById(ID_PLAYER_O).parentElement.querySelector("." + CLASS_WINS).innerHTML = Game.Score.O_WINS;
                    document.getElementById(ID_PLAYER_O).parentElement.querySelector("." + CLASS_TIES).innerHTML = Game.Score.TIES;
                } catch(ignore) {}
            }

            static showPlayerTurn() {
                try {
                    if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                        document.getElementById(ID_PLAYER_X).classList.remove(CLASS_FADE);
                        document.getElementById(ID_PLAYER_O).classList.add(CLASS_FADE);
                    } else {
                        document.getElementById(ID_PLAYER_X).classList.add(CLASS_FADE);
                        document.getElementById(ID_PLAYER_O).classList.remove(CLASS_FADE);
                    }
                } catch(ignore) {}
            }
        }

        static Board = class {
            static EL_CENTER = document.getElementById("CENTER");

            static #LAST_SPACE_INDEX_ADDED = 0;

            static BOARD = [];
            static BOARDS = [];
            static SPACE_EMPTY = 0;
            static SPACE_X = 1;
            static SPACE_O = 2;

            static PIECE_SELECTED = null;

            static remove() {
                Game.Board.BOARD = [];
                Game.Board.BOARDS = [];

                Game.Board.#LAST_SPACE_INDEX_ADDED = 0;

                Game.Board.EL_CENTER.innerHTML = "";

                Game.#IS_GAME_OVER = false;

                Game.#IS_GAME_OVER_ON_BOARD = [];
            }

            static clearBoard() {
                document.querySelectorAll("." + CLASS_SPACE).forEach((space) => space.className = CLASS_SPACE);

                for(let i = 0; i < Game.Board.BOARD.length; i++) {
                    Game.Board.BOARD[i]= Game.Board.SPACE_EMPTY;
                }

                if(Game.Board.BOARDS.length > 0) {
                    document.querySelectorAll("." + CLASS_SPACE_BOARD).forEach((space) => space.className = CLASS_SPACE_BOARD);

                    for(let i = 0; i < Game.Board.BOARDS.length; i++) {
                        for(let j = 0; j < Game.Board.BOARDS[i].length; j++) {
                            Game.Board.BOARDS[i][j] = Game.Board.SPACE_EMPTY;
                        }
                    }
                }
            }

            static generateBasicBoard(size) {
                Game.Board.remove();

                Game.Board.EL_CENTER.appendChild(Game.Board.generateBoard(size));
            }

            static generateInsideOutBoard() {
                Game.Board.remove();

                Game.Board.EL_CENTER.appendChild(Game.Board.generateBoard(3, Game.Board.BOARD, false));

                document.querySelectorAll("." + CLASS_SPACE_BOARD).forEach((space) => {
                    const board = [];

                    space.appendChild(Game.Board.generateBoard(3, board))

                    Game.Board.BOARDS.push(board);

                    Game.#IS_GAME_OVER_ON_BOARD.push(false);
                })
            }

            static generateCoverUpBoard() {
                Game.Board.remove();

                const board = document.createElement("div");
                    board.className = CLASS_BOARD;
                    board.style.gridTemplateColumns = "repeat(3, 1fr)";
                    board.style.gridTemplateRows = "repeat(3, 1fr)";
                    board.dataset.size = 3;

                for(let i = 0; i < 9; i++) {
                    const space = document.createElement("div");
                        space.dataset.index = Game.Board.#LAST_SPACE_INDEX_ADDED;
                        space.className = CLASS_SPACE;
                        space.addEventListener("click", () => Game.Board.tapOnCoverUpSpace(space, space.dataset.index))

                    board.appendChild(space);

                    Game.Board.BOARD.push(Game.Board.SPACE_EMPTY);

                    Game.Board.#LAST_SPACE_INDEX_ADDED++;
                }

                Game.Board.EL_CENTER.appendChild(board);
            }

            static generateBoard(size, boardRef = Game.Board.BOARD, addListener = true) {
                if(size < 3) {
                    size = 3;
                }

                const board = document.createElement("div");
                    board.className = CLASS_BOARD;
                    board.style.gridTemplateColumns = "repeat(" + size + ", 1fr)";
                    board.style.gridTemplateRows = "repeat(" + size + ", 1fr)";
                    board.dataset.size = size;

                if(size > 6) {
                    board.style.setProperty("--d_board-space", "3px");
                } else if(size > 5 || !addListener) {
                    board.style.setProperty("--d_board-space", "4px");
                } else if(size > 4){
                    board.style.setProperty("--d_board-space", "5px");
                }
                
                size *= size;

                for(let i = 0; i < size; i++) {
                    const space = document.createElement("div");
                        space.dataset.index = Game.Board.#LAST_SPACE_INDEX_ADDED;
                        
                        if(addListener) {
                            space.className = CLASS_SPACE;

                            space.addEventListener("click", () => Game.Board.tapOnSpace(space, space.dataset.index, boardRef))
                        } else {
                            space.className = CLASS_SPACE_BOARD;
                        }

                    board.appendChild(space);

                    boardRef.push(Game.Board.SPACE_EMPTY);

                    Game.Board.#LAST_SPACE_INDEX_ADDED++;
                }

                return board;
            }

            static newGame() {
                Game.Board.clearBoard();
                Game.nextPlayer();

                Game.#IS_GAME_OVER = false;

                Game.Board.PIECE_SELECTED = null;

                if(Game.#IS_GAME_OVER_ON_BOARD.length > 0) {
                    for(let i = 0; i < Game.#IS_GAME_OVER_ON_BOARD; i++) {
                        Game.#IS_GAME_OVER_ON_BOARD[i] = false;
                    }
                }

                if(Game.#CURRENT_GAME_ID === Game.Classic.ID_P_C && Game.#PLAYER_PLAYING === Game.#PLAYER_O) {
                    Game.Classic.Computer.doMove(Game.Board.BOARD);
                }
            }

            static tapOnSpace(el, index, board, force = false) {
                if(Game.#IS_GAME_OVER) {
                    Game.Board.newGame();

                    return;
                }

                if(index !== 0) {
                    index = index || el.dataset.index;
                }

                el = el || document.querySelector("." + CLASS_SPACE + "[data-index='" + index + "']");

                if(index >= board.length) {
                    if(Game.#IS_GAME_OVER_ON_BOARD[Game.Board.BOARDS.indexOf(board)]) {
                        return;
                    }

                    index %= board.length;
                }

                if(force || (board[index] === Game.Board.SPACE_EMPTY &&
                    !el.classList.contains(CLASS_O) &&
                    !el.classList.contains(CLASS_X))
                ) {
                    if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                        Utils.clickEffectX();
                    } else {
                        Utils.clickEffectO();
                    }

                    const x = Game.#PLAYER_PLAYING === Game.#PLAYER_X;

                    board[index] = x ? Game.Board.SPACE_X : Game.Board.SPACE_O;
                    
                    el.classList.add(x ? CLASS_X : CLASS_O);

                    Game.Board.validate(index, board);
                }
            }

            static tapOnCoverUpSpace(el, index) {
                if(Game.#IS_GAME_OVER) {
                    Game.Board.newGame();

                    document.querySelectorAll("." + CLASS_SPACE).forEach((space) => {
                        delete space.dataset.weight;
                        space.innerHTML = "";
                    });

                    document.querySelectorAll("." + CLASS_HIDDEN).forEach((piece) => {
                        piece.classList.remove(CLASS_HIDDEN);
                    });

                    return;
                }

                if(index !== 0) {
                    index = index || el.dataset.index;
                }

                el = el || document.querySelector("." + CLASS_SPACE + "[data-index='" + index + "']");

                if(Game.Board.PIECE_SELECTED !== null) {
                    const piece = Game.Board.PIECE_SELECTED.cloneNode();

                    if(el.querySelector("." + CLASS_PIECE)) {
                        if(piece.dataset.weight > el.dataset.weight) {
                            el.innerHTML = "";
                        } else {
                            return;
                        }
                    }

                    piece.classList.remove(CLASS_SELECTED);

                    el.appendChild(piece);

                    el.dataset.weight = piece.dataset.weight;
                    
                    Game.Board.PIECE_SELECTED.classList.remove(CLASS_SELECTED);
                    Game.Board.PIECE_SELECTED.classList.add(CLASS_HIDDEN);

                    Game.Board.PIECE_SELECTED = null;
                    
                    if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                        Utils.clickEffectX();
                    } else {
                        Utils.clickEffectO();
                    }

                    const x = Game.#PLAYER_PLAYING === Game.#PLAYER_X;

                    el.classList.remove(!x ? CLASS_X : CLASS_O);
                    el.classList.add(x ? CLASS_X : CLASS_O);

                    Game.Board.BOARD[index] = x ? Game.Board.SPACE_X : Game.Board.SPACE_O;
                    
                    Game.Board.validate(index, Game.Board.BOARD);
                }
            }

            static validate(addedAtIndex, addedOnBoard) {
                switch(Game.#CURRENT_GAME_ID) {
                    case Game.Classic.ID_P_P:
                    case Game.Classic.ID_P_C:
                        Game.Classic.validate();
                        break;

                    case Game.ThreeOnly.ID_THR_B:
                        Game.ThreeOnly.validateBasic(addedAtIndex);
                        break;

                    case Game.ThreeOnly.ID_THR_Q:
                        Game.ThreeOnly.validateQuick(addedAtIndex);
                        break;

                    case Game.ThreeOnly.ID_THR_L_M:
                        Game.ThreeOnly.validateLimitedMoves(addedAtIndex);
                        break;

                    case Game.Other.ID_OTH_C_S:
                        Game.Other.validateCustomSize();
                        break;

                    case Game.Other.ID_OTH_I_O:
                        Game.Other.validateInsideOut(addedOnBoard);
                        break;
        
                    case Game.Other.ID_OTH_C_U:
                        Game.Other.validateCoverUp();
                        break;
                }
            }

            static basicValidation(board) {
                const sideLength = Math.sqrt(board.length),
                    amountToWin = sideLength > 3 ? 4 : 3,
                    maxPosForRowColumn  = sideLength - amountToWin;

                let winPositions = [];

                for(let row = 0; row < sideLength; row++) {
                    const helper = (row * sideLength);

                    for(let col = 0; col <= maxPosForRowColumn; col++) {
                        let xs = 0,
                            os = 0;
        
                        winPositions = [];

                        for(let pos = 0; pos < amountToWin; pos++) {
                            const j = helper + col + pos;

                            winPositions.push(j);

                            if(board[j] === Game.#PLAYER_X) {
                                xs++;
                            } else if(board[j] === Game.#PLAYER_O) {
                                os++
                            } else {
                                break;
                            }
                        }

                        if(xs === amountToWin) {
                            return [Game.#PLAYER_X, winPositions];
                        } else if(os === amountToWin) {
                            return [Game.#PLAYER_O, winPositions];
                        }
                    }
                }
                
                winPositions = [];

                for(let col = 0; col < sideLength; col++) {
                    for(let row = 0; row <= maxPosForRowColumn; row++) {
                        let xs = 0,
                            os = 0;

                        winPositions = [];

                        const helper = (row * sideLength) + col;

                        for(let pos = 0; pos < amountToWin; pos++) {
                            const j =  helper + (pos * sideLength);

                            winPositions.push(j);

                            if(board[j] === Game.#PLAYER_X) {
                                xs++;
                            } else if(board[j] === Game.#PLAYER_O) {
                                os++
                            } else {
                                break;
                            }
                        }

                        if(xs === amountToWin) {
                            return [Game.#PLAYER_X, winPositions];
                        } else if(os === amountToWin) {
                            return [Game.#PLAYER_O, winPositions];
                        }
                    }
                }

                let incrementBy = sideLength + 1;

                for(let row = 0; row <= maxPosForRowColumn; row++) {
                    for(let col = 0; col <= maxPosForRowColumn; col++) {
                        let xs = 0,
                            os = 0;

                        winPositions = [];

                        const helper = (row * sideLength) + col;

                        for(let pos = 0; pos < amountToWin; pos++) {
                            const j = helper + (incrementBy * pos);

                            winPositions.push(j);

                            if(board[j] === Game.#PLAYER_X) {
                                xs++;
                            } else if(board[j] === Game.#PLAYER_O) {
                                os++
                            } else {
                                break;
                            }
                        }

                        if(xs === amountToWin) {
                            return [Game.#PLAYER_X, winPositions];
                        } else if(os === amountToWin) {
                            return [Game.#PLAYER_O, winPositions];
                        }
                    }
                }
                
                incrementBy = sideLength - 1;

                for(let row = 0; row <= maxPosForRowColumn; row++) {
                    for(let col = sideLength - 1; col >= (sideLength - 1 - maxPosForRowColumn); col--) {
                        let xs = 0,
                            os = 0;

                        winPositions = [];

                        const helper = (row * sideLength) + col;

                        for(let pos = 0; pos < amountToWin; pos++) {
                            const j = helper + (incrementBy * pos);

                            winPositions.push(j);

                            if(board[j] === Game.#PLAYER_X) {
                                xs++;
                            } else if(board[j] === Game.#PLAYER_O) {
                                os++
                            } else {
                                break;
                            }
                        }

                        if(xs === amountToWin) {
                            return [Game.#PLAYER_X, winPositions];
                        } else if(os === amountToWin) {
                            return [Game.#PLAYER_O, winPositions];
                        }
                    }
                }

                if(Game.Board.isFilled(board)) {
                    return -1;
                }
            
                return null;
            }

            static isFilled(board) {
                for(let i = 0; i < board.length; i++) {
                    if(board[i] === Game.Board.SPACE_EMPTY) {
                        return false;
                    }
                }
    
                return true;
            }

            static showWin(positons) {
                if(Game.#CURRENT_GAME_ID === Game.Other.ID_OTH_I_O) {
                    document.querySelectorAll("." + CLASS_SPACE_BOARD).forEach((space) => {
                        space.classList.remove(CLASS_BLINK);
                        space.classList.add(CLASS_FADE)
                    });
                } else {
                    document.querySelectorAll("." + CLASS_SPACE).forEach((space) => {
                        space.classList.remove(CLASS_BLINK);
                        space.classList.add(CLASS_FADE)
                    });
                }

                positons.forEach((pos) => {
                    const el = document.querySelector("." + CLASS_SPACE + "[data-index='" + pos + "']") || document.querySelector("." + CLASS_SPACE_BOARD + "[data-index='" + pos + "']")

                    el.classList.add(CLASS_BLINK);
                    el.classList.remove(CLASS_FADE);
                });
            }

            static showTie() {
                if(Game.#CURRENT_GAME_ID === Game.Other.ID_OTH_I_O) {
                    document.querySelectorAll("." + CLASS_SPACE_BOARD).forEach((space) => {
                        space.classList.remove(CLASS_BLINK);
                        space.classList.remove(CLASS_FADE)

                        setTimeout(() => {
                            space.classList.add(CLASS_BLINK);
                        }, 20);
                    });
                } else {
                    document.querySelectorAll("." + CLASS_SPACE).forEach((space) => {
                        space.classList.remove(CLASS_FADE);
                        space.classList.remove(CLASS_BLINK);

                        setTimeout(() => {
                            space.classList.add(CLASS_FADE);
                            space.classList.add(CLASS_BLINK);
                        }, 20);
                    });
                }
            }
        };

        static Classic = class {
            static ID_P_P = "Classic_PvsP";
            static ID_P_C = "Classic_PvsC";

            static gamePlayerVsPlayer() {
                Game.reset();

                Game.Score.reset();

                Game.Board.generateBasicBoard(3);

                Game.Score.generateBasicScore();
            }

            static gamePlayerVsComputer() {
                Game.reset();

                Game.Score.reset();
                
                Game.Board.generateBasicBoard(3);

                Game.Score.generateBasicScore();

                Game.Score.EL_TOP.classList.add(CLASS_COMPUTER);
            }

            static validate() {
                const result = Game.Board.basicValidation(Game.Board.BOARD);

                if(result === null) {
                    Game.nextPlayer();

                    if(Game.#CURRENT_GAME_ID === Game.Classic.ID_P_C && Game.#PLAYER_PLAYING === Game.#PLAYER_O) {
                        Game.Classic.Computer.doMove(Game.Board.BOARD);
                    }
                } else if(result === -1) {
                    Game.#IS_GAME_OVER = true;

                    Utils.tieEffect();

                    Game.Board.showTie();
                    
                    Game.Score.TIES++;

                    Game.Score.showScore();
                } else {
                    Game.#IS_GAME_OVER = true;

                    Utils.winEffect();

                    Game.Board.showWin(result[1]);

                    if(result[0] === Game.#PLAYER_X) {
                        Game.Score.X_WINS++;
                    } else {
                        Game.Score.O_WINS++;
                    }

                    Game.Score.showScore();
                }
            }

            static Computer = class {
                static doMove(board) {
                    setTimeout(() => {
                        if(board[0] + board[1] + board[2] == 4) {
                            Game.Classic.Computer._fillRow(0, board);
                        } else if(board[3] + board[4] + board[5] == 4) {
                            Game.Classic.Computer._fillRow(1, board);
                        } else if(board[6] + board[7] + board[8] == 4) {
                            Game.Classic.Computer._fillRow(2, board);
                        } else if(board[0] + board[3] + board[6] == 4) {
                            Game.Classic.Computer._fillColumn(0, board);
                        } else if(board[1] + board[4] + board[7] == 4) {
                            Game.Classic.Computer._fillColumn(1, board);
                        } else if(board[2] + board[5] + board[8] == 4) {
                            Game.Classic.Computer._fillColumn(2, board);
                        } else if(board[0] + board[4] + board[8] == 4) {
                            Game.Classic.Computer._fillDiagonal(0, board);
                        } else if(board[2] + board[4] + board[6] == 4) {
                            Game.Classic.Computer._fillDiagonal(1, board);
                        } else if(board[0] + board[1] + board[2] == 2) {
                            Game.Classic.Computer._fillRow(0, board);
                        } else if(board[3] + board[4] + board[5] == 2) {
                            Game.Classic.Computer._fillRow(1, board);
                        } else if(board[6] + board[7] + board[8] == 2) {
                            Game.Classic.Computer._fillRow(2, board);
                        } else if(board[0] + board[3] + board[6] == 2) {
                            Game.Classic.Computer._fillColumn(0, board);
                        } else if(board[1] + board[4] + board[7] == 2) {
                            Game.Classic.Computer._fillColumn(1, board);
                        } else if(board[2] + board[5] + board[8] == 2) {
                            Game.Classic.Computer._fillColumn(2, board);
                        } else if(board[0] + board[4] + board[8] == 2) {
                            Game.Classic.Computer._fillDiagonal(0, board);
                        } else if(board[2] + board[4] + board[6] == 2) {
                            Game.Classic.Computer._fillDiagonal(1, board);
                        } else {
                            Game.Classic.Computer._randomMove(board);
                        }
                    }, 200);
                }

                static _fillRow(row, board) {
                    const a = (row == 0) ? 0 : ((row == 1 ? 3 : 6)),
                        b = (row == 0) ? 1 : ((row == 1 ? 4 : 7)),
                        c = (row == 0) ? 2 : ((row == 1 ? 5 : 8));

                    let madeIt = false;
            
                    if(board[a] == 0) {
                        row = a;
                        madeIt = true;
                    } else if(board[b] == 0) {
                        row = b;
                        madeIt = true;
                    } else if(board[c] == 0) {
                        row = c;
                        madeIt = true;
                    }
                
                    if(madeIt) {
                        Game.Board.tapOnSpace(false, row, board);
                    } else {
                        Game.Classic.Computer._randomMove(board);
                    }
                }

                static _fillColumn(col, board) {
                    const a = (col == 0) ? 0 : ((col == 1 ? 1 : 2)),
                        b = (col == 0) ? 3 : ((col == 1 ? 4 : 5)),
                        c = (col == 0) ? 6 : ((col == 1 ? 7 : 8));

                    let madeIt = false;
                
                    if(board[a] == 0) {
                        col = a;
                        madeIt = true;
                    } else if(board[b] == 0) {
                        col = b;
                        madeIt = true;
                    } else if(board[c] == 0) {
                        col = c;
                        madeIt = true;
                    }
                
                    if(madeIt) {
                        Game.Board.tapOnSpace(false, col, board);
                    } else {
                        Game.Classic.Computer._randomMove(board);
                    }
                }

                static _fillDiagonal(dia, board) {
                    let madeIt = false;
                
                    if(dia === 0) {
                        if(board[0] == 0) {
                            dia = 0;
                            madeIt = true;
                        } else if(board[4] == 0) {
                            dia = 4;
                            madeIt = true;
                        } else if(board[8] == 0) {
                            dia = 8;
                            madeIt = true;
                        }
                    } else {
                        if(board[2] == 0) {
                            dia = 2;
                            madeIt = true;
                        } else if(board[4] == 0) {
                            dia, board = 4;
                            madeIt = true;
                        } else if(board[6] == 0) {
                            dia = 6;
                            madeIt = true;
                        }
                    }
                
                    if(madeIt) {
                        Game.Board.tapOnSpace(false, dia, board);
                    } else {
                        Game.Classic.Computer._randomMove(board);
                    }
                }

                static _randomMove(board) {
                    Utils.randomMove(board);
                }
            }
        };

        static ThreeOnly = class {
            static ID_THR_B = "ThreeOnly_Basic";
            static ID_THR_Q = "ThreeOnly_Quick";
            static ID_THR_L_M = "ThreeOnly_LimitedMoves";

            static #INDEXES_X = [];
            static #INDEXES_O = [];

            static #LAST_INDEX_REMOVED;

            static #EL_BAR;

            static #MOVES;
            static #MAX_MOVES;

            static TIME_INTERNVAL;

            static reset() {
                clearInterval(Game.ThreeOnly.TIME_INTERNVAL);

                Game.ThreeOnly.#INDEXES_X = [];
                Game.ThreeOnly.#INDEXES_O = [];

                Game.ThreeOnly.#MOVES = 0;
                Game.ThreeOnly.#MAX_MOVES = Utils.randomNumberIncluded(9, 30);
            }

            static _addIndexToPlayer(addedAtIndex) {
                if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                    Game.ThreeOnly.#INDEXES_X.push(Number(addedAtIndex));
                } else {
                    Game.ThreeOnly.#INDEXES_O.push(Number(addedAtIndex));
                }
            }

            static _removeOrPrepareToRemove(board) {
                if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                    if(Game.ThreeOnly.#INDEXES_X.length === 3) {
                        const index = Game.ThreeOnly.#INDEXES_X[0];

                        board[index] = Game.Board.SPACE_EMPTY;

                        document.querySelector("." + CLASS_SPACE + "[data-index='" + index + "']").classList.add(CLASS_BLINK);

                        Game.ThreeOnly.#LAST_INDEX_REMOVED = index;
                    }

                    if(Game.ThreeOnly.#INDEXES_O.length > 3) {
                        const index = Game.ThreeOnly.#INDEXES_O[0];

                        document.querySelector("." + CLASS_SPACE + "[data-index='" + index + "']").className = CLASS_SPACE;

                        Game.ThreeOnly.#INDEXES_O.shift();

                    }       
                } else {
                    if(Game.ThreeOnly.#INDEXES_O.length === 3) {
                        const index = Game.ThreeOnly.#INDEXES_O[0];

                        board[index] = Game.Board.SPACE_EMPTY;

                        document.querySelector("." + CLASS_SPACE + "[data-index='" + index + "']").classList.add(CLASS_BLINK);

                        Game.ThreeOnly.#LAST_INDEX_REMOVED = index;
                    }
                    
                    if(Game.ThreeOnly.#INDEXES_X.length > 3) {
                        const index = Game.ThreeOnly.#INDEXES_X[0];

                        document.querySelector("." + CLASS_SPACE + "[data-index='" + index + "']").className = CLASS_SPACE;

                        Game.ThreeOnly.#INDEXES_X.shift();
                    }
                }
            }

            static _addBar() {
                const container = document.createElement("div");
                    container.id = "BAR_CONTAINER";

                const bar = document.createElement("div");
                    bar.id = "BAR";

                container.appendChild(bar);

                document.querySelector("." + CLASS_BOARD).appendChild(container);

                Game.ThreeOnly.#EL_BAR = bar;
            }

            static gameBasic() {
                Game.reset();

                Game.ThreeOnly.reset();

                Game.Score.reset();

                Game.Board.generateBasicBoard(3);

                Game.Score.generateBasicScore();
            }

            static validateBasic(addedAtIndex) {
                Game.ThreeOnly._addIndexToPlayer(addedAtIndex);

                const result = Game.Board.basicValidation(Game.Board.BOARD);

                if(result === null) {
                    Game.nextPlayer();

                    Game.ThreeOnly._removeOrPrepareToRemove(Game.Board.BOARD);
                } else {
                    Game.#IS_GAME_OVER = true;

                    if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                        if(Game.ThreeOnly.#INDEXES_X.length > 3) {
                            document.querySelector("." + CLASS_SPACE + "[data-index='" + Game.ThreeOnly.#INDEXES_X[0] + "']").className = CLASS_SPACE;
                        }
                    } else {
                        if(Game.ThreeOnly.#INDEXES_O.length > 3) {
                            document.querySelector("." + CLASS_SPACE + "[data-index='" + Game.ThreeOnly.#INDEXES_O[0] + "']").className = CLASS_SPACE;
                        }
                    }

                    Utils.winEffect();

                    Game.Board.showWin(result[1]);

                    if(result[0] === Game.#PLAYER_X) {
                        Game.Score.X_WINS++;
                    } else {
                        Game.Score.O_WINS++;
                    }

                    Game.Score.showScore();

                    Game.ThreeOnly.reset();
                }
            }

            static gameQuick() {
                Game.reset();

                Game.ThreeOnly.reset();

                Game.Score.reset();

                Game.Board.generateBasicBoard(3);

                Game.ThreeOnly._addBar();

                Game.Score.generateBasicScore();       
            }

            static _startTimer() {
                clearInterval(Game.ThreeOnly.TIME_INTERNVAL);

                Game.ThreeOnly.#EL_BAR.className = Game.#PLAYER_PLAYING === Game.#PLAYER_X ? "red" : "blue";

                let percentage = 100;

                Game.ThreeOnly.TIME_INTERNVAL = setInterval(() => {
                    Game.ThreeOnly.#EL_BAR.style.height = --percentage + "%";

                    if(percentage === 0) {                   
                        document.querySelector("." + CLASS_SPACE + "[data-index='" + Game.ThreeOnly.#LAST_INDEX_REMOVED + "']").classList.remove(CLASS_BLINK);

                        Utils.randomMove(Game.Board.BOARD, true);
                    }
                }, 15);
            }

            static _stopTimer() {
                clearInterval(Game.ThreeOnly.TIME_INTERNVAL);

                Game.ThreeOnly.#EL_BAR.className = "";
            }

            static validateQuick(addedAtIndex) {
                Game.ThreeOnly._stopTimer();

                Game.ThreeOnly._addIndexToPlayer(addedAtIndex);

                const result = Game.Board.basicValidation(Game.Board.BOARD);

                if(result === null) {
                    Game.nextPlayer();

                    if(addedAtIndex !== Game.ThreeOnly.#LAST_INDEX_REMOVED) {
                        Game.ThreeOnly._removeOrPrepareToRemove(Game.Board.BOARD);
                    }

                    if(++Game.ThreeOnly.#MOVES >= 6) {
                        Game.ThreeOnly._startTimer();
                    }
                } else {
                    Game.#IS_GAME_OVER = true;

                    if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                        if(Game.ThreeOnly.#INDEXES_X.length > 3) {
                            document.querySelector("." + CLASS_SPACE + "[data-index='" + Game.ThreeOnly.#INDEXES_X[0] + "']").className = CLASS_SPACE;
                        }
                    } else {
                        if(Game.ThreeOnly.#INDEXES_O.length > 3) {
                            document.querySelector("." + CLASS_SPACE + "[data-index='" + Game.ThreeOnly.#INDEXES_O[0] + "']").className = CLASS_SPACE;
                        }
                    }

                    Utils.winEffect();

                    Game.Board.showWin(result[1]);

                    if(result[0] === Game.#PLAYER_X) {
                        Game.Score.X_WINS++;
                    } else {
                        Game.Score.O_WINS++;
                    }

                    Game.Score.showScore();

                    Game.ThreeOnly.reset();
                }
            }

            static gameLimitedMoves() {
                Game.reset();

                Game.ThreeOnly.reset();

                Game.Score.reset();

                Game.Board.generateBasicBoard(3);

                Game.ThreeOnly._addBar();

                Game.ThreeOnly.#EL_BAR.className = "xo";

                Game.Score.generateBasicScore();
            }

            static validateLimitedMoves(addedAtIndex) {
                Game.ThreeOnly._addIndexToPlayer(addedAtIndex);

                const result = Game.Board.basicValidation(Game.Board.BOARD);

                if(result !== null) {
                    Game.#IS_GAME_OVER = true;

                    if(Game.#PLAYER_PLAYING === Game.#PLAYER_X) {
                        if(Game.ThreeOnly.#INDEXES_X.length > 3) {
                            document.querySelector("." + CLASS_SPACE + "[data-index='" + Game.ThreeOnly.#INDEXES_X[0] + "']").className = CLASS_SPACE;
                        }
                    } else {
                        if(Game.ThreeOnly.#INDEXES_O.length > 3) {
                            document.querySelector("." + CLASS_SPACE + "[data-index='" + Game.ThreeOnly.#INDEXES_O[0] + "']").className = CLASS_SPACE;
                        }
                    }

                    Utils.winEffect();

                    Game.Board.showWin(result[1]);

                    if(result[0] === Game.#PLAYER_X) {
                        Game.Score.X_WINS++;
                    } else {
                        Game.Score.O_WINS++;
                    }

                    Game.Score.showScore();

                    Game.ThreeOnly.reset();

                    Game.ThreeOnly.#EL_BAR.style.height = "0";

                } else if(++Game.ThreeOnly.#MOVES === Game.ThreeOnly.#MAX_MOVES) {
                    Game.#IS_GAME_OVER = true;

                    Game.ThreeOnly.#EL_BAR.style.height = "0";

                    Utils.tieEffect();

                    Game.Board.showTie();
                    
                    Game.Score.TIES++;

                    Game.Score.showScore();

                    Game.ThreeOnly.reset();
                } else {
                    Game.nextPlayer();

                    Game.ThreeOnly._removeOrPrepareToRemove(Game.Board.BOARD);

                    Game.ThreeOnly.#EL_BAR.style.height = ((100 * Game.ThreeOnly.#MOVES) / Game.ThreeOnly.#MAX_MOVES) + "%";
                }
            }
        }

        static Other = class {
            static ID_OTH_C_S = "Other_CustomSize";
            static ID_OTH_I_O = "Other_InsideOut";
            static ID_OTH_C_U = "Other_CoverUp";

            static #STORAGE_KEY_C_S = "TTC_customSize";

            static #EL_POPUP_C_S = document.getElementById("POPUP_USTOM_SIZE");
            static EL_INPUT_C_S = document.getElementById("INPUT_CUSTOM_SIZE");
            static EL_BUTTON_C_S = document.getElementById("BUTTON_CUSTOM_SIZE");

            static #MOVES = 0;

            static gameCustomSize() {
                Game.Other.EL_INPUT_C_S.value = localStorage.getItem(Game.Other.#STORAGE_KEY_C_S) || 4;

                Game.Other.#EL_POPUP_C_S.classList.add(CLASS_OPEN);

                setTimeout(() => Game.Other.EL_INPUT_C_S.focus(), 30);
            }

            static gameCustomSizeSet() {
                let value = Game.Other.EL_INPUT_C_S.value;
                
                value = value
                        .replaceAll(".", "")
                        .replaceAll(",", "")
                        .replaceAll("-", "");

                value = Number(value);

                Game.reset();

                Game.Score.reset();

                Game.Score.generateBasicScore();

                Game.Board.generateBasicBoard(value < 4 ? 4 : value);

                Game.Other.#EL_POPUP_C_S.classList.remove(CLASS_OPEN);

                localStorage.setItem(Game.Other.#STORAGE_KEY_C_S, value);
            }

            static validateCustomSize() {
                const result = Game.Board.basicValidation(Game.Board.BOARD);

                if(result === null) {
                    Game.nextPlayer();
                } else if(result === -1) {
                    Game.#IS_GAME_OVER = true;

                    Utils.tieEffect();

                    Game.Board.showTie();
                    
                    Game.Score.TIES++;

                    Game.Score.showScore();
                } else {
                    Game.#IS_GAME_OVER = true;

                    Utils.winEffect();

                    Game.Board.showWin(result[1]);

                    if(result[0] === Game.#PLAYER_X) {
                        Game.Score.X_WINS++;
                    } else {
                        Game.Score.O_WINS++;
                    }

                    Game.Score.showScore();
                }
            }

            static gameInsideOut() {
                Game.reset();

                Game.Score.reset();

                Game.Score.generateBasicScore();

                Game.Board.generateInsideOutBoard();
            }

            static validateInsideOut(addedOnBoard) {
                const resultIn = Game.Board.basicValidation(addedOnBoard);

                if(resultIn === null) {
                    Game.nextPlayer();
                } else if(resultIn === -1) {
                    for(let i = 0; i < addedOnBoard.length; i++) {
                        addedOnBoard[i] = Game.Board.SPACE_EMPTY;
                    }

                    const index = (Game.Board.BOARDS.indexOf(addedOnBoard) * 9) + 9;

                    for(let i = index; i < index + 9; i++) {
                        document.querySelector("." + CLASS_SPACE + "[data-index='" + i + "']").className = CLASS_SPACE;
                    }
                } else {
                    const index = Game.Board.BOARDS.indexOf(addedOnBoard);

                    Game.#IS_GAME_OVER_ON_BOARD[index] = true;

                    Game.Board.BOARD[index] = Game.#PLAYER_PLAYING;

                    const spaceBoard = document.querySelector("." + CLASS_SPACE_BOARD + "[data-index='" + index + "']");

                    spaceBoard.classList.add(Game.#PLAYER_PLAYING === Game.#PLAYER_X ? CLASS_X : CLASS_O);
                    spaceBoard.classList.add(CLASS_DONE);
                }

                const resultOut = Game.Board.basicValidation(Game.Board.BOARD);

                if(resultOut === null) {
                    return;
                } else {
                    Game.#IS_GAME_OVER = true;

                    if(resultOut === -1) { 
                        Utils.tieEffect();
        
                        Game.Board.showTie();
                        
                        Game.Score.TIES++;
                        } else {
    
                        Utils.winEffect();
        
                        Game.Board.showWin(resultOut[1]);
        
                        if(resultOut[0] === Game.#PLAYER_X) {
                            Game.Score.X_WINS++;
                        } else {
                            Game.Score.O_WINS++;
                        }
        
                    }

                    Game.Score.showScore();

                    document.querySelectorAll("." + CLASS_SPACE_BOARD).forEach((space) => {
                        space.addEventListener("click", () => {
                            Game.Board.generateInsideOutBoard();
                        }, true);
                    });
                }
            }

            static gameCoverUp() {
                Game.reset();

                Game.Score.reset();

                Game.Board.generateCoverUpBoard();

                Game.Score.generateCoverUpPieces();
            }

            static validateCoverUp() {
                const result = Game.Board.basicValidation(Game.Board.BOARD);

                if(++Game.Other.#MOVES === 12 && result !== null && typeof result !== "object") {
                    Game.#IS_GAME_OVER = true;

                    Utils.tieEffect();

                    Game.Board.showTie();
                    
                    Game.Score.TIES++;

                    Game.Score.showScore();

                    Game.Other.#MOVES = 0;
                } else if(result === null) {
                    Game.nextPlayer();
                } else if(result !== -1) {
                    Game.#IS_GAME_OVER = true;

                    Utils.winEffect();

                    Game.Board.showWin(result[1]);

                    if(result[0] === Game.#PLAYER_X) {
                        Game.Score.X_WINS++;
                    } else {
                        Game.Score.O_WINS++;
                    }

                    Game.Score.showScore();

                    Game.Other.#MOVES = 0;
                }
            }
        }
    }

    class Menu {
        static EL_MENU = document.getElementById("MENU");
        static EL_BTN = document.getElementById("BTN_MENU");
        static EL_LIST = document.getElementById("MENU-LIST");
        static EL_LIST_ITEM_GAMES = Menu.EL_LIST.querySelectorAll(".menu-item-game");

        static toggle() {
            Menu.EL_MENU.classList.toggle(CLASS_OPEN);
        }

        static unselectAll() {
            Menu.EL_LIST.querySelectorAll("." + CLASS_SELECTED).forEach((el) => el.classList.remove(CLASS_SELECTED));
        }

        static listGameSelect(id) {
            Menu.unselectAll();

            document.getElementById(id).classList.add(CLASS_SELECTED);
        }

        static listGameItemClicked(ev) {
            Utils.clickEffect();

            if(!Utils.isDesktop()) {
                Menu.toggle();
            }

            Game.play(ev.target.id);
        }
    }

    class Sound {
        static EL_BTN = document.getElementById("BTN_SOUND");

        static #STORAGE_KEY = "TTC_sound";

        static #ENABLED = true;

        static #SOUND_CLICK_O = new Audio("audio/sound/o.wav");
        static #SOUND_CLICK_X = new Audio("audio/sound/x.wav")

        static init() {
            Sound.#ENABLED = (localStorage.getItem(Sound.#STORAGE_KEY) || "true") === "true";

            if(!Sound.#ENABLED) {
                Sound.EL_BTN.classList.add(CLASS_OFF);
            }
        }

        static toggle() {
            const b = !((localStorage.getItem(Sound.#STORAGE_KEY) || "true") === "true");

            Sound.#ENABLED = b;

            localStorage.setItem(Sound.#STORAGE_KEY, b);

            if(Sound.#ENABLED) {
                Sound.EL_BTN.classList.remove(CLASS_OFF);
            } else {
                Sound.EL_BTN.classList.add(CLASS_OFF);
            }
        }

        static clickO() {
            if(this.#ENABLED) {
                Sound.#SOUND_CLICK_O.play();
            }
        }

        static clickX() {
            if(this.#ENABLED) {
                Sound.#SOUND_CLICK_X.play();
            }
        }
    }

    class Music {
        static EL_BTN = document.getElementById("BTN_MUSIC");

        static #STORAGE_KEY = "TTC_music";

        static #ENABLED = true;

        static #MUSICS = [
            new Audio("audio/music/0.mp3"),
            new Audio("audio/music/1.mp3"),
            new Audio("audio/music/2.mp3"),
            new Audio("audio/music/3.mp3")
        ];

        static #CURRENT;

        static init() {
            Music.#ENABLED = (localStorage.getItem(Music.#STORAGE_KEY) || "true") === "true";

            Music.#CURRENT = Utils.randomNumberIncluded(0, Music.#MUSICS.length - 1);

            Music.#MUSICS.forEach((music) => {
                music.volume = 0.4;
                music.addEventListener("ended", () => Music.playNext());
            })

            if(Music.#ENABLED) {
                Music.play();
            } else {
                Music.EL_BTN.classList.add(CLASS_OFF);
            }
        }

        static firstTouch() {
            if(Music.#ENABLED) {
                Music.play();

                window.removeEventListener("mousedown", Music.firstTouch);
            }
        }

        static toggle() {
            const b = !((localStorage.getItem(Music.#STORAGE_KEY) || "true") === "true");

            Music.#ENABLED = b;

            localStorage.setItem(Music.#STORAGE_KEY, b);

            if(Music.#ENABLED) {
                Music.EL_BTN.classList.remove(CLASS_OFF);
                Music.play();
            } else {
                Music.EL_BTN.classList.add(CLASS_OFF);
                Music.pause();
            }
        }

        static play() {
            if(Music.#CURRENT > Music.#MUSICS.length - 1) {
                Music.#CURRENT = 0;
            }

            Music.#MUSICS[Music.#CURRENT].play();
        }

        static pause() {
            Music.#MUSICS[Music.#CURRENT].pause();
        }

        static playNext() {
            if(++Music.#CURRENT > Music.#MUSICS.length - 1) {
                Music.#CURRENT = 0;
            }

            Music.play();
        }
    }

    class Vibration {
        static EL_BTN = document.getElementById("BTN_VIBRATION");

        static #STORAGE_KEY = "TTC_vibration";

        static #ENABLED = true;

        static init() {
            Vibration.#ENABLED = (localStorage.getItem(Vibration.#STORAGE_KEY) || "true") === "true";

            if(!Vibration.#ENABLED) {
                Vibration.EL_BTN.classList.add(CLASS_OFF);
            }
        }

        static toggle() {
            const b = !((localStorage.getItem(Vibration.#STORAGE_KEY) || "true") === "true");

            Vibration.#ENABLED = b;

            localStorage.setItem(Vibration.#STORAGE_KEY, b);

            if(Vibration.#ENABLED) {
                Vibration.EL_BTN.classList.remove(CLASS_OFF);
            } else {
                Vibration.EL_BTN.classList.add(CLASS_OFF);
            }
        }

        static click() {
            if(this.#ENABLED) {
                navigator.vibrate(15);
            }
        }

        static win() {
            if(this.#ENABLED) {
                navigator.vibrate([200, 25, 200, 25, 200, 25, 600]);
            }
        }

        static tie() {
            if(this.#ENABLED) {
                navigator.vibrate(700);
            }
        }
    }

    class Utils {
        static clickEffect() {
            Vibration.click();
        }

        static clickEffectO() {
            Vibration.click();
            Sound.clickO();
        }

        static clickEffectX() {
            Vibration.click();
            Sound.clickX();
        }

        static winEffect() {
            Vibration.win()
        }

        static tieEffect() {
            Vibration.tie();
        }

        static isDesktop() {
            const userAgent = navigator.userAgent || window.opera || navigator.vendor;
        
            return !(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substr(0, 4)));
        }

        static randomNumberIncluded(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        }

        static randomMove(board, force = false) {
            const size = board.length;

            let pos = (Math.floor(Math.random() * size));

            while(board[pos] !== 0) {
                pos = (Math.floor(Math.random() * size));
            }

            Game.Board.tapOnSpace(false, pos, board, force);
        }
    }

    class Debug {
        static printBoard(board) {
            const size = Math.sqrt(board.length);

            let r = 0;

            for(let i = 0; i < board.length; i += size) {
                let row = ++r + "   ";
                
                for(let j = 0; j < size; j++) {
                    row += board[i + j] + " ";
                }

                console.log(row);
            }

            console.log("-------------------------------");
        }
    }
})();