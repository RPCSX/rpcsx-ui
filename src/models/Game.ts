export class Game {
    name: string;
    image: string;
    publisher: string;
    region: Region;
    version: string;
    serial: string;
    // Size in bytes
    size: number;

    constructor(name: string,
                image: string,
                publisher: string,
                region: Region,
                version: string,
                serial: string,
                size: number) {
        this.name = name;
        this.image = image;
        this.publisher = publisher;
        this.region = region;
        this.version = version;
        this.serial = serial;
        this.size = size;
    }
}

export enum Region {
    USA = "USA",
    Europe = "Europe",
    Japan = "Japan",
    Asia = "Asia",
    World = "World",
    Unknown = "Unknown"
}