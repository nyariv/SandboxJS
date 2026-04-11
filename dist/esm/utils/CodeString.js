//#region src/utils/CodeString.ts
var CodeString = class CodeString {
	constructor(str) {
		this.ref = { str: "" };
		if (str instanceof CodeString) {
			this.ref = str.ref;
			this.start = str.start;
			this.end = str.end;
		} else {
			this.ref.str = str;
			this.start = 0;
			this.end = str.length;
		}
	}
	substring(start, end) {
		if (!this.length) return this;
		start = this.start + start;
		if (start < 0) start = 0;
		if (start > this.end) start = this.end;
		end = end === void 0 ? this.end : this.start + end;
		if (end < 0) end = 0;
		if (end > this.end) end = this.end;
		const code = new CodeString(this);
		code.start = start;
		code.end = end;
		return code;
	}
	get length() {
		const len = this.end - this.start;
		return len < 0 ? 0 : len;
	}
	char(i) {
		if (this.start === this.end) return void 0;
		return this.ref.str[this.start + i];
	}
	toString() {
		return this.ref.str.substring(this.start, this.end);
	}
	trimStart() {
		const found = /^\s+/.exec(this.toString());
		const code = new CodeString(this);
		if (found) code.start += found[0].length;
		return code;
	}
	slice(start, end) {
		if (start < 0) start = this.end - this.start + start;
		if (start < 0) start = 0;
		if (end === void 0) end = this.end - this.start;
		if (end < 0) end = this.end - this.start + end;
		if (end < 0) end = 0;
		return this.substring(start, end);
	}
	trim() {
		const code = this.trimStart();
		const found = /\s+$/.exec(code.toString());
		if (found) code.end -= found[0].length;
		return code;
	}
	valueOf() {
		return this.toString();
	}
};
//#endregion
export { CodeString };

//# sourceMappingURL=CodeString.js.map