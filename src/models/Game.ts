export class Game {
    name: string;
    publisher: string;
    version: string;
    serial: string;
    // Size in bytes
    size: number;

    constructor(name: string, publisher: string, version: string, serial: string, size: number) {
        this.name = name;
        this.publisher = publisher;
        this.version = version;
        this.serial = serial;
        this.size = size;
    }
}