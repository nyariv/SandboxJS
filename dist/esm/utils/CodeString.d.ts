export declare class CodeString {
    start: number;
    end: number;
    ref: {
        str: string;
    };
    constructor(str: string | CodeString);
    substring(start: number, end?: number): CodeString;
    get length(): number;
    char(i: number): string | undefined;
    toString(): string;
    trimStart(): CodeString;
    slice(start: number, end?: number): CodeString;
    trim(): CodeString;
    valueOf(): string;
}
