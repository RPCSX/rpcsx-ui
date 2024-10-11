export class Game {
    name: string;
    image: string;
    publisher: string;
    version: string;
    serial: string;
    // Size in bytes
    size: number;

    constructor(name: string, image: string, publisher: string, version: string, serial: string, size: number) {
        this.name = name;
        this.image = image;
        this.publisher = publisher;
        this.version = version;
        this.serial = serial;
        this.size = size;
    }
}