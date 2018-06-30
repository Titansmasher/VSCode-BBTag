import * as extensions from "../extensions";
import { SubTag } from "../structures/subtag";
import { BBTag } from "../structures/bbtag";
import { IRange } from "../structures/selection";
import * as Fuse from "fuse.js";

export type DataType = "nothing" | "text" | "number" | "boolean" | "array" | "color" | "user" | "channel" | "role" | "guild" | number;
export interface ValidationResult {
    range: IRange;
    message: string;
}


export interface SubTagDefinition {
    /** The name of the SubTag */
    readonly name: string;
    /** A brief description of the SubTag. */
    readonly title: string;
    /** The category of the SubTag. */
    readonly category?: "Simple" | "Complex" | "Array" | "CCommand";
    /** A detailed description of the SubTag. */
    readonly description: string;
    /** The type(s) that the SubTag returns. */
    readonly returns: DataType | DataType[];
    /** An array of parameters which the SubTag accepts. */
    readonly parameters: (Parameter | ParameterGroup)[];

    /** An optional method to validate the SubTag as a whole. */
    readonly validate?: (subtag: SubTag) => true | ValidationResult | ValidationResult[];

    //[key: string]: any;
}

export interface ParameterGroup {
    /** Specify the indexes of parameters that can be swapped. */
    readonly interchangable?: number[] | number[][];
    /** A list of all parameters or groups within this group. */
    readonly children: (Parameter | ParameterGroup)[];
    /** Is the group required? Defaults to `false` */
    readonly required?: boolean | number | ((bbtag: BBTag) => boolean);

    /** An optional method to validate all contained parameters. */
    readonly validate?: (bbtag: BBTag[]) => true | ValidationResult | ValidationResult[];

    //[key: string]: any;
}

export interface Parameter {
    /** The name of the parameter. */
    readonly name: string;
    /** The data type(s) that the parameter accepts. */
    readonly accepts: DataType | DataType[];
    /** Specifies a limited range of values the parameter can accept. */
    readonly restricted?: string[] | ((bbtag: BBTag) => string[]) | [number, number];
    /** Is the parameter required? Defaults to `false`. */
    readonly required?: boolean | number | ((bbtag: BBTag) => boolean);
    /** Can the parameter accept multiple values. If `true`, any excess values provided will be taken by this parameter. */
    readonly extended?: boolean;
    /** Specifies the level of support for arrays. */
    readonly array?: "ignored" | "optional" | "required";

    /** An optional method to validate this parameter. */
    readonly validate?: (bbtag: BBTag) => true | ValidationResult | ValidationResult[];

    //[key: string]: any;
}

export class SubTagDefinitionManager {
    public readonly list: SubTagDefinition[] = [];
    private readonly _fuse: Fuse = new Fuse(this.list, {
        caseSensitive: false,
        includeScore: true,
        shouldSort: true,
        keys: ["name"]
    });

    public findExact(name: string): SubTagDefinition {
        name = name.toLowerCase();
        return this.list.find(t => t.name == name);
    }

    public findClose(name: string): SubTagDefinition[] {
        let results = this._fuse.search<{ score: number, item: SubTagDefinition }>(name);
        if (results.length == 0) return [];

        console.debug(results);
        if (results[0].score == 0) return [results[0].item];
        return results.filter(r => r.score < 0.1).slice(0, 5).map(r => r.item);
    }
}

export const definitions = new SubTagDefinitionManager();
export default definitions;

let dummies = ["//", "abs", "apply", "args", "argsarray", "argslength", "ban", "base", "base64decode", "base64encode", "bool", "brainfuck", "capitalize", "channelid", "channelname", "channelpos", "choose", "clean", "color", "commandname", "commit", "concat", "decrement", "delete", "dm", "edit", "embed", "embedbuild", "emoji", "exec", "execcc", "fallback", "flag", "flagset", "for", "foreach", "function", "get", "guildcreatedat", "guildicon", "guildid", "guildmembers", "guildname", "guildownerid", "guildsize", "hash", "if", "increment", "indexof", "inject", "isarray", "iscc", "isnsfw", "isstaff", "join", "kick", "lang", "lb", "length", "lock", "logic", "lower", "math", "max", "messageattachments", "messageedittime", "messageembeds", "messageid", "messagesender", "messagetext", "messagetime", "min", "modlog", "newline", "nsfw", "output", "pad", "pardon", "parsefloat", "parseint", "pop", "prefix", "push", "quiet", "randchoose", "randint", "randstr", "randuser", "rb", "reactadd", "reactlist", "reactremove", "realpad", "regexmatch", "regexreplace", "regexsplit", "regextest", "repeat", "replace", "return", "reverse", "roleadd", "rolecolor", "rolecreate", "roledelete", "roleid", "rolemembers", "rolemention", "rolename", "roleremove", "roles", "rolesetmentionable", "rolesize", "rollback", "round", "rounddown", "roundup", "semi", "send", "set", "shift", "shuffle", "sleep", "slice", "sort", "space", "splice", "split", "substring", "subtagexists", "suppresslookup", "switch", "throw", "time", "timer", "trim", "unban", "upper", "uriencode", "useravatar", "usercreatedat", "userdiscrim", "usergame", "usergametype", "userhasrole", "userid", "userisbot", "userjoinedat", "usermention", "username", "usernick", "usersetnick", "userstatus", "usertimezone", "void", "waitmessage", "waitreaction", "warn", "warnings", "webhook", "while", "zws", "absolute", "addreact", "addrole", "atob", "attachments", "btoa", "buildembed", "ceil", "colour", "floor", "func", "hasrole", "inguild", "inrole", "ismod", "listreact", "loop", "match", "radix", "removereact", "removerole", "sender", "setnick", "text", "timestamp", "userbot", "waitreact"];

let subtags = extensions.requireFolder("./data/subtags");
for (const key of Object.keys(subtags)) {
    let subtag = subtags[key];
    let index = dummies.indexOf(subtag.name);
    definitions.list.push(subtag);

    if (index != -1)
        dummies.splice(index, 1);
}

for (const dummy of dummies) {
    definitions.list.push({
        name: dummy,
        category: "dummy" as any,
        title: "A dummy tag",
        description: "A dummy tag, loaded automatically",
        parameters: [],
        returns: "text"
    })
}
