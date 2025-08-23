class LinkedNode<T> {
    constructor(public value: T, public next?: LinkedNode<T>) {}
}

export class LinkedList<T> {
    private _head?: LinkedNode<T> = undefined;

    empty() {
        return this._head?.next == undefined;
    }

    unshift(element: T) {
        if (this._head == undefined) {
            this._head = new LinkedNode<any>(undefined);
        }

        const newHead = new LinkedNode<any>(undefined);

        const node = this._head;
        node.value = element;
        newHead.next = node;

        this._head = newHead;

        return () => {
            if (newHead.next == node) {
                newHead.next = node.next;
                (node.value as any) = undefined;
            }
        };
    }

    shift() {
        if (!this._head?.next) {
            return undefined;
        }

        const result = this._head.next.value;
        this._head = this._head.next;
        (this._head.value as any) = undefined;
        return result;
    }

    dispose() {
        this.clear();
    }

    clear() {
        let node = this._head;
        while (node != undefined) {
            const nextNode = node.next;
            node.next = undefined;
            node = nextNode;
        }
    }

    forEach(cb: (item: T, index: number) => void) {
        let node = this._head?.next;
        let index = 0;
        while (node !== undefined) {
            cb(node.value, index++);
            node = node.next;
        }
    }

    *[Symbol.iterator](): Iterator<T> {
        let node = this._head?.next;
        while (node !== undefined) {
            yield node.value;
            node = node.next;
        }
    }
}
