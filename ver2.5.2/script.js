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
        this.cursorX += dx * this.sensitivityX;
        this.cursorY += dy * this.sensitivityY;
        if (this.cursorX < 0) this.cursorX = 0;
        if (this.cursorY < 0) this.cursorY = 0;
        if (this.cursorX > this.screen.offsetWidth) this.cursorX = this.screen.offsetWidth;
        if (this.cursorY > this.screen.offsetHeight) this.cursorY = this.screen.offsetHeight;
        this.updateCursorPosition();
    }
    updateCursorPosition() {
        this.cursor.style.left = `${this.cursorX}px`;
        this.cursor.style.top = `${this.cursorY}px`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const parentSystem = new TrackpadSystem('parent-screen', 'parent-trackpad', 'parent-cursor');
    const childSystem = new TrackpadSystem('child-screen', 'child-trackpad', 'child-cursor');
    const grandchildSystem = new TrackpadSystem('grandchild-screen', 'grandchild-trackpad', 'grandchild-cursor');
    const greatGrandchildSystem = new TrackpadSystem('great-grandchild-screen', 'great-grandchild-trackpad', 'great-grandchild-cursor');
    
    childSystem.sensitivityX *= parentSystem.sensitivityX;
    childSystem.sensitivityY *= parentSystem.sensitivityY;
    grandchildSystem.sensitivityX *= childSystem.sensitivityX;
    grandchildSystem.sensitivityY *= childSystem.sensitivityY;
    greatGrandchildSystem.sensitivityX *= grandchildSystem.sensitivityX;
    greatGrandchildSystem.sensitivityY *= grandchildSystem.sensitivityY;
    
    let isMouseOverParentTrackpad = false;
    parentSystem.trackpad.addEventListener('mouseenter', () => { isMouseOverParentTrackpad = true; });
    parentSystem.trackpad.addEventListener('mouseleave', () => { isMouseOverParentTrackpad = false; });

    const isOver = (cursor, trackpad) => {
        const cRect = cursor.getBoundingClientRect();
        const tRect = trackpad.getBoundingClientRect();
        return cRect.left < tRect.right && cRect.right > tRect.left && cRect.top < tRect.bottom && cRect.bottom > tRect.top;
    };

    function executeVirtualClick(systemToClick) {
        const screenRect = systemToClick.screen.getBoundingClientRect();
        const absoluteX = screenRect.left + systemToClick.cursorX;
        const absoluteY = screenRect.top + systemToClick.cursorY;

        parentSystem.cursor.style.visibility = 'hidden';
        childSystem.cursor.style.visibility = 'hidden';
        grandchildSystem.cursor.style.visibility = 'hidden';
        greatGrandchildSystem.cursor.style.visibility = 'hidden';
        
        const targetElement = document.elementFromPoint(absoluteX, absoluteY);

        parentSystem.cursor.style.visibility = 'visible';
        childSystem.cursor.style.visibility = 'visible';
        grandchildSystem.cursor.style.visibility = 'visible';
        greatGrandchildSystem.cursor.style.visibility = 'visible';

        if (targetElement) {
            console.log(`${systemToClick.cursor.id}が要素[${targetElement.tagName}]をクリックします`);
            targetElement.click();
        }
    }

    parentSystem.trackpad.addEventListener('click', () => {
        const isParentOverChild = isOver(parentSystem.cursor, childSystem.trackpad);
        const isChildOverGrandchild = isOver(childSystem.cursor, grandchildSystem.trackpad);
        const isGrandchildOverGreatGrandchild = isOver(grandchildSystem.cursor, greatGrandchildSystem.trackpad);

        if (isParentOverChild && isChildOverGrandchild && isGrandchildOverGreatGrandchild) {
            executeVirtualClick(greatGrandchildSystem);
        } else if (isParentOverChild && isChildOverGrandchild) {
            executeVirtualClick(grandchildSystem);
        } else if (isParentOverChild) {
            executeVirtualClick(childSystem);
        } else {
            executeVirtualClick(parentSystem);
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseOverParentTrackpad) return;
        const dx = e.movementX;
        const dy = e.movementY;

        parentSystem.moveBy(dx, dy);

        const isParentOverChild = isOver(parentSystem.cursor, childSystem.trackpad);
        if (isParentOverChild) {
            childSystem.moveBy(dx, dy);
        }

        const isChildOverGrandchild = isOver(childSystem.cursor, grandchildSystem.trackpad);
        if (isParentOverChild && isChildOverGrandchild) {
            grandchildSystem.moveBy(dx, dy);
        }
        
        const isGrandchildOverGreatGrandchild = isOver(grandchildSystem.cursor, greatGrandchildSystem.trackpad);
        if (isParentOverChild && isChildOverGrandchild && isGrandchildOverGreatGrandchild) {
            greatGrandchildSystem.moveBy(dx, dy);
        }
    });
});