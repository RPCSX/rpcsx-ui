export class Game {
    constructor(
        public name: string,
        public image: string,
        public publisher: string,
        public region: Region,
        public version: string,
        public serial: string,
        public size: number) { }
}

export enum Region {
    USA = "USA",
    Europe = "Europe",
    Japan = "Japan",
    Asia = "Asia",
    World = "World",
    Unknown = "Unknown"
}
