// =================================================
// TrackpadSystem Class
// =================================================
class TrackpadSystem {
    constructor(screenId, trackpadId, cursorId) {
        this.screen = document.getElementById(screenId);
        this.trackpad = document.getElementById(trackpadId);
        this.cursor = document.getElementById(cursorId);
        if (!this.screen || !this.trackpad || !this.cursor) { throw new Error(`${screenId}の要素が見つかりません。`); }
        this.cursorX = this.screen.offsetWidth / 2;
        this.cursorY = this.screen.offsetHeight / 2;
        this.sensitivityX = this.screen.offsetWidth / this.trackpad.offsetWidth;
        this.sensitivityY = this.screen.offsetHeight / this.trackpad.offsetHeight;
        this.updateCursorPosition();
    }
    moveBy(dx, dy) {
        this.cursorX += dx * this.sensitivityX; this.cursorY += dy * this.sensitivityY;
        if (this.cursorX < 0) this.cursorX = 0; if (this.cursorY < 0) this.cursorY = 0;
        if (this.cursorX > this.screen.offsetWidth) this.cursorX = this.screen.offsetWidth;
        if (this.cursorY > this.screen.offsetHeight) this.cursorY = this.screen.offsetHeight;
        this.updateCursorPosition();
    }
    updateCursorPosition() {
        this.cursor.style.left = `${this.cursorX}px`;
        this.cursor.style.top = `${this.cursorY}px`;
    }
}

// =================================================
// Game Class
// =================================================
class Game {
    constructor(containerId, onAllLevelsComplete) {
        this.container = document.getElementById(containerId);
        this.onAllLevelsComplete = onAllLevelsComplete;
        this.gameState = 'waiting';
        this.dots = [];
        this.playerPattern = [];
        this.levelLengths = [3, 5, 7];
        this.currentLevel = 0;
        this._createUI();
    }
    _createUI() {
        const gameUiContainer = document.createElement('div');
        gameUiContainer.className = 'game-ui-container';
        gameUiContainer.innerHTML = `
            <div class="game-controls">
                <button class="level-btn" data-level="0">L1</button>
                <button class="level-btn" data-level="1">L2</button>
                <button class="level-btn" data-level="2">L3</button>
            </div>
            <div class="dot-grid"></div>
            <p class="status-text">レベルを選択してください</p>
        `;
        this.container.appendChild(gameUiContainer);
        const dotGrid = this.container.querySelector('.dot-grid');
        for (let i = 0; i < 9; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.dataset.id = i;
            dotGrid.appendChild(dot);
            this.dots.push(dot);
        }
        this.statusText = this.container.querySelector('.status-text');
    }
    async startLevel(level) {
        if (this.gameState === 'showing') return;
        this.currentLevel = level;
        this.gameState = 'showing';
        this.currentLevelPattern = this._generateAdjacentPattern(this.levelLengths[level]);
        this.playerPattern = [];
        this.statusText.textContent = '覚えてください';
        await this._sleep(1000);
        for (const dotId of this.currentLevelPattern) {
            await this._glowDot(this.dots[dotId], 500);
            await this._sleep(250);
        }
        this.gameState = 'playing';
        this.statusText.textContent = `レベル ${level + 1} どうぞ！`;
    }
    handleDotClick(dotId) {
        if (this.gameState !== 'playing' || this.playerPattern.includes(dotId)) return;
        this.playerPattern.push(dotId);
        this._glowDot(this.dots[dotId], 300);
        if (this.playerPattern.length === this.currentLevelPattern.length) {
            this._checkAnswer();
        }
    }
    async _checkAnswer() {
        this.gameState = 'waiting';
        const isCorrect = JSON.stringify(this.playerPattern) === JSON.stringify(this.currentLevelPattern);
        if (isCorrect) {
            this.statusText.textContent = `レベル ${this.currentLevel + 1} クリア！ 〇`;
            await this._sleep(1500);
            if (this.currentLevel < this.levelLengths.length - 1) {
                this.startLevel(this.currentLevel + 1);
            } else {
                this.statusText.textContent = '全レベルクリア！';
                if (this.onAllLevelsComplete) this.onAllLevelsComplete();
            }
        } else {
            this.statusText.textContent = `失敗！ × 同じレベルに再挑戦`;
            await this._sleep(1500);
            this.startLevel(this.currentLevel);
        }
    }
    _areDotsAdjacent(id1, id2) { const r1=Math.floor(id1/3),c1=id1%3,r2=Math.floor(id2/3),c2=id2%3; const rd=Math.abs(r1-r2),cd=Math.abs(c1-c2); return rd<=1&&cd<=1&&(rd+cd>0); }
    _generateAdjacentPattern(len) { let p=[],v=new Array(9).fill(false); let c=Math.floor(Math.random()*9); p.push(c); v[c]=true; while(p.length<len){ let n=[]; for(let i=0;i<9;i++)if(!v[i]&&this._areDotsAdjacent(c,i))n.push(i); if(n.length===0)return this._generateAdjacentPattern(len); const next=n[Math.floor(Math.random()*n.length)]; p.push(next); v[next]=true; c=next;} return p; }
    _glowDot(dot, dur) { return new Promise(r => { dot.classList.add('glowing'); setTimeout(() => { dot.classList.remove('glowing'); r(); }, dur); }); }
    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// =================================================
// GameManager
// =================================================
const GameManager = {
    currentState: null,
    window: document.getElementById('game-window'),
    systems: {},
    eventHandlers: {},
    game: null,

    init: function() { this.changeState('PHASE_1_INTRO'); },
    changeState: function(newState) {
        this.currentState = newState;
        this.clearAllListeners();
        this.systems = {};
        this.game = null;
        this.window.innerHTML = '';
        const setupFunction = this[`setup${newState}`];
        if (setupFunction) {
            setupFunction.call(this);
        } else {
            console.error(`${newState} に対応するsetup関数が見つかりません。`);
        }
    },
    addManagedListener: function(key, el, type, handler) { this.eventHandlers[key] = { element: el, type: type, handler: handler }; el.addEventListener(type, handler); },
    clearAllListeners: function() { for (const key in this.eventHandlers) { const { element, type, handler } = this.eventHandlers[key]; element.removeEventListener(type, handler); } this.eventHandlers = {}; },
    showNotification: function(message, duration) { const n = document.createElement('div'); n.className = 'notification-overlay'; n.textContent = message; this.window.appendChild(n); setTimeout(() => n.remove(), duration); },
    getElementAtVirtualCursor: function(systemToClick) { const allCursors = Object.values(this.systems).map(s => s.cursor); const screenRect = systemToClick.screen.getBoundingClientRect(); const aX = screenRect.left + systemToClick.cursorX, aY = screenRect.top + systemToClick.cursorY; allCursors.forEach(c => c.style.visibility = 'hidden'); const target = document.elementFromPoint(aX, aY); allCursors.forEach(c => c.style.visibility = 'visible'); return target; },
    
    // ★★★ フェーズ1のロジックを修正 ★★★
    setupPHASE_1_INTRO: function() {
        this.window.innerHTML = `<div class="container">
            <div class="intro-object"></div>
            <p class="intro-text">トラックパッドを触ってみましょう</p>
        </div>`;
        const introObject = this.window.querySelector('.intro-object');
        const introText = this.window.querySelector('.intro-text');
        let hasMoved = false;

        const moveHandler = () => {
            if (hasMoved) return;
            hasMoved = true;
            
            // 3秒待つ
            setTimeout(() => {
                introText.textContent = 'カーソルを動かしてクリックしてください';
                introObject.textContent = 'Click!';
                // クリック可能にする
                this.addManagedListener('introClick', introObject, 'click', () => {
                    this.changeState('PHASE_2_TUTORIAL');
                });
            }, 3000);
        };
        // 最初のマウス移動を検知
        this.addManagedListener('introMove', window, 'mousemove', moveHandler);
    },
    
    setupPHASE_2_TUTORIAL: function() {
        this.window.innerHTML = `<div class="text-overlay"><p class="overlay-text">これがトラックパッドでした。次は、「仮想」トラックパッドを体験してみましょう。</p><button class="overlay-btn">OK</button></div>`;
        this.addManagedListener('exp1_ok', this.window.querySelector('.overlay-btn'), 'click', () => {
            this.window.innerHTML = '';
            this.buildPhase2UIAndLogic();
        });
    },

    buildPhase2UIAndLogic: function() {
        this.window.innerHTML = `<div class="tutorial-container"><p id="task-instruction"></p><div id="parent-screen" class="screen"><div id="parent-cursor" class="cursor"></div></div><div id="parent-trackpad" class="trackpad"></div></div>`;
        const instruction = document.getElementById('task-instruction');
        instruction.textContent = '青の仮想トラックパッド上をなぞると、青の仮想カーソルが動きます';
        
        this.systems.parent = new TrackpadSystem('parent-screen', 'parent-trackpad', 'parent-cursor');
        
        let isHovering = false, hasMoved = false, target = null, hoverTimeout = null, hoverStartTime = null;

        this.addManagedListener('p2_enter', this.systems.parent.trackpad, 'mouseenter', () => isHovering = true);
        this.addManagedListener('p2_leave', this.systems.parent.trackpad, 'mouseleave', () => isHovering = false);

        const moveHandler = (e) => {
            if (!isHovering) return;
            this.systems.parent.moveBy(e.movementX, e.movementY);
            if (!hasMoved) {
                hasMoved = true;
                setTimeout(() => {
                    instruction.textContent = '青いカーソルをTargetに乗せてください';
                    target = document.createElement('div');
                    target.id = 'hover-target';
                    target.innerHTML = `<div id="target-progress"></div>Target`;
                    this.systems.parent.screen.appendChild(target);
                }, 3000);
            }
            if (target) {
                const progress = document.getElementById('target-progress');
                const cRect = this.systems.parent.cursor.getBoundingClientRect(), tRect = target.getBoundingClientRect();
                const isOver = !(cRect.right < tRect.left || cRect.left > tRect.right || cRect.bottom < tRect.top || cRect.top > tRect.bottom);
                if (isOver && !hoverTimeout) {
                    hoverStartTime = Date.now();
                    hoverTimeout = setInterval(() => {
                        const elapsed = Date.now() - hoverStartTime;
                        progress.style.height = `${(elapsed / 2000) * 100}%`;
                        if (elapsed >= 2000) {
                            clearInterval(hoverTimeout); hoverTimeout = null;
                            this.showNotification("クリア！", 1500);
                            setTimeout(() => this.changeState('PHASE_3_TUTORIAL'), 1500);
                        }
                    }, 50);
                } else if (!isOver && hoverTimeout) {
                    clearInterval(hoverTimeout); hoverTimeout = null;
                    progress.style.height = '0%';
                }
            }
        };
        this.addManagedListener('p2_move', window, 'mousemove', moveHandler);
    },

    setupPHASE_3_TUTORIAL: function() {
        this.window.innerHTML = `<div class="tutorial-container"><p id="task-instruction">青のカーソルでオレンジのトラックパッドに触れると、オレンジのカーソルが動きます。<br>オレンジのカーソルでターゲットをクリックしてください</p><div id="parent-screen" class="screen"><div id="parent-cursor" class="cursor"></div><div id="child-screen" class="screen"><div id="child-cursor" class="cursor"></div><button id="click-target">Target</button></div><div id="child-trackpad" class="trackpad"></div></div><div id="parent-trackpad" class="trackpad"></div></div>`;
        this.systems.parent = new TrackpadSystem('parent-screen', 'parent-trackpad', 'parent-cursor');
        this.systems.child = new TrackpadSystem('child-screen', 'child-trackpad', 'child-cursor');
        this.systems.child.sensitivityX *= this.systems.parent.sensitivityX; this.systems.child.sensitivityY *= this.systems.parent.sensitivityY;
        let isHovering = false;
        this.addManagedListener('p3_enter', this.systems.parent.trackpad, 'mouseenter', () => isHovering = true);
        this.addManagedListener('p3_leave', this.systems.parent.trackpad, 'mouseleave', () => isHovering = false);
        const isOver = (c, t) => { const cR = c.getBoundingClientRect(), tR = t.getBoundingClientRect(); return cR.left < tR.right && cR.right > tR.left && cR.top < tR.bottom && cR.bottom > tR.top; };
        this.addManagedListener('p3_move', window, 'mousemove', e => {
            if (!isHovering) return;
            const dx = e.movementX, dy = e.movementY;
            this.systems.parent.moveBy(dx, dy);
            if (isOver(this.systems.parent.cursor, this.systems.child.trackpad)) this.systems.child.moveBy(dx, dy);
        });
        this.addManagedListener('p3_click', this.systems.parent.trackpad, 'click', () => {
            const targetSystem = isOver(this.systems.parent.cursor, this.systems.child.trackpad) ? this.systems.child : this.systems.parent;
            this.getElementAtVirtualCursor(targetSystem)?.click();
        });
        this.addManagedListener('target_click', document.getElementById('click-target'), 'click', () => {
            this.showNotification("クリア！", 1500);
            setTimeout(() => this.changeState('PHASE_4_TUTORIAL'), 1500);
        });
    },

    setupPHASE_4_TUTORIAL: function() {
        this.window.innerHTML = `<div class="tutorial-container"><p id="task-instruction">緑のカーソルでアイテムをゴールへドラッグ＆ドロップしてください</p><div id="parent-screen" class="screen"><div id="parent-cursor" class="cursor"></div><div id="child-screen" class="screen"><div id="child-cursor" class="cursor"></div><div id="grandchild-screen" class="screen"><div id="grandchild-cursor" class="cursor"></div><div id="drag-item">Item</div><div id="drop-goal">Goal</div></div><div id="grandchild-trackpad" class="trackpad"></div></div><div id="child-trackpad" class="trackpad"></div></div><div id="parent-trackpad" class="trackpad"></div></div>`;
        this.systems = { parent: new TrackpadSystem('parent-screen', 'parent-trackpad', 'parent-cursor'), child: new TrackpadSystem('child-screen', 'child-trackpad', 'child-cursor'), grandchild: new TrackpadSystem('grandchild-screen', 'grandchild-trackpad', 'grandchild-cursor') };
        this.systems.child.sensitivityX *= this.systems.parent.sensitivityX; this.systems.child.sensitivityY *= this.systems.parent.sensitivityY;
        this.systems.grandchild.sensitivityX *= this.systems.child.sensitivityX; this.systems.grandchild.sensitivityY *= this.systems.child.sensitivityY;
        let isHovering = false, isVirtualDragging = false;
        const dragItem = document.getElementById('drag-item'), goal = document.getElementById('drop-goal');
        const isOver = (c, t) => { const cR = c.getBoundingClientRect(), tR = t.getBoundingClientRect(); return cR.left < tR.right && cR.right > tR.left && cR.top < tR.bottom && cR.bottom > tR.top; };
        this.addManagedListener('p4_enter', this.systems.parent.trackpad, 'mouseenter', () => isHovering = true);
        this.addManagedListener('p4_leave', this.systems.parent.trackpad, 'mouseleave', () => isHovering = false);
        this.addManagedListener('p4_down', this.systems.parent.trackpad, 'mousedown', () => {
            if (isOver(this.systems.parent.cursor, this.systems.child.trackpad) && isOver(this.systems.child.cursor, this.systems.grandchild.trackpad)) {
                const targetEl = this.getElementAtVirtualCursor(this.systems.grandchild);
                if (targetEl && targetEl.id === 'drag-item') {
                    isVirtualDragging = true;
                    dragItem.style.cursor = 'grabbing';
                }
            }
        });
        this.addManagedListener('p4_up', window, 'mouseup', () => {
            if (!isVirtualDragging) return;
            isVirtualDragging = false;
            dragItem.style.cursor = 'grab';
            const itemRect = dragItem.getBoundingClientRect(), goalRect = goal.getBoundingClientRect();
            if (itemRect.left < goalRect.right && itemRect.right > goalRect.left && itemRect.top < goalRect.bottom && itemRect.bottom > goalRect.top) {
                this.showNotification("クリア！", 1500);
                setTimeout(() => this.changeState('PHASE_5_GAME'), 1500);
            }
        });
        this.addManagedListener('p4_move', window, 'mousemove', e => {
            if (!isHovering) return;
            const dx = e.movementX, dy = e.movementY;
            this.systems.parent.moveBy(dx, dy);
            const isParentOverChild = isOver(this.systems.parent.cursor, this.systems.child.trackpad);
            if (isParentOverChild) {
                this.systems.child.moveBy(dx, dy);
            }
            const isChildOverGrandchild = isOver(this.systems.child.cursor, this.systems.grandchild.trackpad);
            if (isParentOverChild && isChildOverGrandchild) {
                this.systems.grandchild.moveBy(dx, dy);
                if (isVirtualDragging) {
                    dragItem.style.left = `${this.systems.grandchild.cursorX - dragItem.offsetWidth/2}px`;
                    dragItem.style.top = `${this.systems.grandchild.cursorY - dragItem.offsetHeight/2}px`;
                }
            }
        });
    },

    setupPHASE_5_GAME: function() {
        this.window.innerHTML = `<div class="tutorial-container"><p id="task-instruction">パターン記憶ゲームスタート！緑のカーソルでプレイしてください。</p><div id="parent-screen" class="screen"><div id="parent-cursor" class="cursor"></div><div id="child-screen" class="screen"><div id="child-cursor" class="cursor"></div><div id="grandchild-screen" class="screen game-active"><div id="grandchild-cursor" class="cursor"></div></div><div id="grandchild-trackpad" class="trackpad"></div></div><div id="child-trackpad" class="trackpad"></div></div><div id="parent-trackpad" class="trackpad"></div></div>`;
        this.systems = {
            parent: new TrackpadSystem('parent-screen', 'parent-trackpad', 'parent-cursor'),
            child: new TrackpadSystem('child-screen', 'child-trackpad', 'child-cursor'),
            grandchild: new TrackpadSystem('grandchild-screen', 'grandchild-trackpad', 'grandchild-cursor')
        };
        this.systems.child.sensitivityX *= this.systems.parent.sensitivityX; this.systems.child.sensitivityY *= this.systems.parent.sensitivityY;
        this.systems.grandchild.sensitivityX *= this.systems.child.sensitivityX; this.systems.grandchild.sensitivityY *= this.systems.child.sensitivityY;
        this.game = new Game('grandchild-screen', () => { this.showNotification("完全クリア！おめでとう！", 5000); });
        this.game.startLevel(0);
        let isHovering = false;
        const isOver = (c, t) => { const cR = c.getBoundingClientRect(), tR = t.getBoundingClientRect(); return cR.left < tR.right && cR.right > tR.left && cR.top < tR.bottom && cR.bottom > tR.top; };
        this.addManagedListener('p5_enter', this.systems.parent.trackpad, 'mouseenter', () => isHovering = true);
        this.addManagedListener('p5_leave', this.systems.parent.trackpad, 'mouseleave', () => isHovering = false);
        this.addManagedListener('p5_move', window, 'mousemove', e => {
            if (!isHovering) return;
            const dx = e.movementX, dy = e.movementY;
            this.systems.parent.moveBy(dx, dy);
            const isParentOverChild = isOver(this.systems.parent.cursor, this.systems.child.trackpad);
            if (isParentOverChild) this.systems.child.moveBy(dx, dy);
            const isChildOverGrandchild = isOver(this.systems.child.cursor, this.systems.grandchild.trackpad);
            if (isParentOverChild && isChildOverGrandchild) this.systems.grandchild.moveBy(dx, dy);
        });
        this.addManagedListener('p5_click', this.systems.parent.trackpad, 'click', () => {
            const isParentOverChild = isOver(this.systems.parent.cursor, this.systems.child.trackpad);
            const isChildOverGrandchild = isOver(this.systems.child.cursor, this.systems.grandchild.trackpad);
            let targetSystem;
            if (isParentOverChild && isChildOverGrandchild) targetSystem = this.systems.grandchild;
            else if (isParentOverChild) targetSystem = this.systems.child;
            else targetSystem = this.systems.parent;
            const targetElement = this.getElementAtVirtualCursor(targetSystem);
            if (!targetElement) return;
            if (targetSystem === this.systems.grandchild) {
                if (targetElement.classList.contains('level-btn')) {
                    this.game.startLevel(parseInt(targetElement.dataset.level));
                } else if (targetElement.classList.contains('dot')) {
                    this.game.handleDotClick(parseInt(targetElement.dataset.id));
                }
            }
        });
    },
};

// --- ゲーム開始 ---
document.addEventListener('DOMContentLoaded', () => {
    GameManager.init();
});