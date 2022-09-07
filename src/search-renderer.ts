import { App, MarkdownRenderer, requireApiVersion, TFile } from "obsidian";

const isFifteenPlus = requireApiVersion && requireApiVersion("0.15.0");
export class SearchMarkdownRenderer extends MarkdownRenderer {
    app: App;
    subpath: string;
    indent: string;
    file: TFile;
    match: any;
    filePath: string;
    before: string;
    after: string;

    constructor(app: App, containerEl: HTMLElement, match: any) {
        // @ts-ignore
        super(app, containerEl);
        this.app = app;
        this.match = match;
        this.subpath = "";
        this.indent = "";
        this.filePath = isFifteenPlus ? this.match.parentDom.path : this.match.parent.path;
        this.file = isFifteenPlus ? this.match.parentDom.file : this.match.parent.file;
        this.renderer.previewEl.onNodeInserted(() => {
            this.updateOptions();
            return this.renderer.onResize();
        });
    }

    updateOptions() {
        let readableLineLength = this.app.vault.getConfig("readableLineLength");
        this.renderer.previewEl.toggleClass("is-readable-line-width", readableLineLength);
        let foldHeading = this.app.vault.getConfig("foldHeading");
        this.renderer.previewEl.toggleClass("allow-fold-headings", foldHeading);
        let foldIndent = this.app.vault.getConfig("foldIndent");
        this.renderer.previewEl.toggleClass("allow-fold-lists", foldIndent);
        this.renderer.previewEl.toggleClass("rtl", this.app.vault.getConfig("rightToLeft"));

        if (!foldHeading) {
            this.renderer.unfoldAllHeadings();
        }

        if (!foldIndent) {
            this.renderer.unfoldAllLists();
        }

        this.renderer.previewEl.toggleClass("show-frontmatter", this.app.vault.getConfig("showFrontmatter"));
        let tabSize = this.app.vault.getConfig("tabSize");
        this.renderer.previewEl.style.tabSize = String(tabSize);
        this.renderer.rerender();
    }

    onRenderComplete() { }

    getFile() {
        const parentFile = isFifteenPlus ? this.match.parentDom.file : this.match.parent.file;
        return parentFile;
    }

    async edit(content: string) {
        //this.renderer.set(content);
        let cachedContent = await this.app.vault.cachedRead(this.file);
        let matchContent = cachedContent.slice(this.match.start, this.match.end);
        let newContent = "";
        let checkboxChanged = false;
        if (matchContent.match(/[ ]*[\-\*] \[.\] /)) {
            const lineSplit = matchContent.split("\n");
            const renderedContentSplit = content.split("\n");
            for (let i = 0; i < lineSplit.length; i++) {
                const eachLine = lineSplit[i];
                let updatedCheckbox = eachLine;
                const checkBoxMatch = eachLine.match(/[ ]*[\-\*] \[.\] /);
                if (checkBoxMatch && checkboxChanged === false) {
                    const lineCheckType = eachLine.match(/[ ]*[\-\*] \[(.)\] /);
                    const renderedLine = renderedContentSplit[i];
                    const renderedLineCheckType = renderedLine.match(/[ ]*[\-\*] \[(.)\] /);
                    if (lineCheckType && renderedLineCheckType) {
                        if (lineCheckType[1] != renderedLineCheckType[1]) {
                            checkboxChanged = true;
                            updatedCheckbox = updatedCheckbox.replace(/^([ ]*[\-\*] )\[.\] /, `$1[${renderedLineCheckType[1]}] `);
                        } else {
                        }
                    }
                }
                if (i > 0) {
                    newContent += "\n";
                }
                newContent += updatedCheckbox;
            }
        } else {
            // console.log("No checkbox found in search match");
        }
        if (checkboxChanged && newContent !== matchContent) {
            let before = cachedContent.slice(0, this.match.start);
            let after = cachedContent.substring(this.match.end);
            let combinedContent = before + newContent + after;
            this.app.vault.modify(this.file, combinedContent);
            console.log(`Checkbox changed, updating file from:\n\n${matchContent}\n\nto -->\n\n${newContent}`);
        } else {
            console.log("Not a checkbox... but something else was trying to be edited... need to investigate! Did NOT change the file at all though.");
            console.log("Class SearchMarkdownRenderer.edit():\n", content);
            console.log(this);
            console.log(this.renderer);
        }
        //this.renderer.rerender();
    }
}
