// ./states/State.js

export class State {
    static currentState = null;

    static setState(state) {
        State.currentState = state;
    }

    static getState() {
        return State.currentState;
    }

    constructor(game) {
        this.game = game;
    }

    // Subclasses override these
    tick() { }
    render(ctx) { }
}
