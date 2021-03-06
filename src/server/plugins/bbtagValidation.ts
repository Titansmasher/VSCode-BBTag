import SubTags, { DataType } from "../../common/data/subtagDefinition"
import { TextDocument, DiagnosticSeverity, Diagnostic } from "vscode-languageserver/lib/main";
import { BBSubTag } from "../../common/structures/subtag";
import { IRange } from "../../common/structures/selection";
import server from "../server";

async function main(document: TextDocument) {
    let bbtag = await server.cache.getDocument(document).bbtag;
    let context = new ValidationContext();

    parseMeta(bbtag.subTags[0], context);
    for (const subtag of bbtag.allSubTags) {
        await validate(subtag, context);
    }

    console.log('Sending Diagnostics. Errors: ', context.errors.length);
    server.connection.sendDiagnostics({ uri: document.uri, diagnostics: context.toDiagnostics() });
}

async function validate(subtag: BBSubTag, context: ValidationContext) {
    if (subtag == null || subtag.definition != null) return;

    if (subtag.parentSubTags.find(t => t.name == "//")) {
        // Do nothing
    } else if (subtag.parentSubTags.find(t => t.name == "j" || t.name == "json")) {
        // Do nothing
    } else if (subtag.name == "*Dynamic") {
        context.warnings.push({
            range: subtag.range,
            message: "Dynamic subtag found. Validation cannot be performed (yet)"
        });
    } else if (subtag.name.startsWith('func.')) {
        // Do nothing
    } else {
        let matches = await SubTags.findClose(subtag.name);
        if (matches.length == 0)
            context.errors.push({
                range: subtag.range,
                message: "Unknown SubTag: `" + subtag.name + "`"
            });
        else
            context.errors.push({
                range: subtag.range,
                message: "Unknown SubTag: `" + subtag.name + "`. Did you mean one of the following?: " + matches.map(m => "`" + m.name + "`").join(", ")
            });
    }
}

function parseMeta(subtag: BBSubTag, context: ValidationContext) {
    if (subtag == null) return;
    if (subtag.name != "//") return;
    if (subtag.params[1].content != "<META>") return;

    for (const param of subtag.params.slice(2)) {
        let [key, value] = param.content.split(":");
        switch (key) {
            case "variables":
            case "variable":
            case "vars":
            case "var":
                let json = JSON.parseSafe<string[]>(value);
                if (json.success &&
                    Array.isArray(json.result) &&
                    json.result.reduce((p, r) => p && typeof r == "string", true))
                    context.meta.variables.push(...json.result.map(r => {
                        return {
                            name: r,
                            nameRange: param.range,
                            type: "text",
                            range: param.range
                        } as VariableDef
                    }));
        }
    }
}

interface ValidationResult {
    range: IRange;
    message: string;
}

interface VariableDef {
    range: IRange;
    name: string;
    nameRange: IRange;
    type: DataType;
}

class ValidationMeta {
    public readonly variables: VariableDef[] = [];
}

class ValidationContext {
    public readonly errors: ValidationResult[] = [];
    public readonly warnings: ValidationResult[] = [];
    public readonly info: ValidationResult[] = [];
    public readonly hints: ValidationResult[] = [];

    public readonly meta: ValidationMeta = new ValidationMeta();

    public toDiagnostics(): Diagnostic[] {
        let diagnostics = [];
        diagnostics.push(...this.errors.map(e => this.toDiagnostic(e, DiagnosticSeverity.Error)));
        diagnostics.push(...this.warnings.map(e => this.toDiagnostic(e, DiagnosticSeverity.Warning)));
        diagnostics.push(...this.info.map(e => this.toDiagnostic(e, DiagnosticSeverity.Information)));
        diagnostics.push(...this.hints.map(e => this.toDiagnostic(e, DiagnosticSeverity.Hint)));

        return diagnostics;
    }

    private toDiagnostic(result: ValidationResult, severity: DiagnosticSeverity): Diagnostic {
        return {
            range: result.range,
            severity: severity,
            message: result.message
        }
    }
}

server.events.onDocumentUpdate.add(main);