// ./states/State.js

export class State {
    static currentState = null;

    // Called with the new state on every change (game.js switches the music)
    static onChange = null;

    static setState(state) {
        State.currentState = state;
        State.onChange?.(state);
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
