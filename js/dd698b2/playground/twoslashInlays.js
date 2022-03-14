var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createTwoslashInlayProvider = void 0;
    const createTwoslashInlayProvider = (sandbox) => {
        const provider = {
            provideInlayHints: (model, _, cancel) => __awaiter(void 0, void 0, void 0, function* () {
                const text = model.getValue();
                const queryRegex = /^\s*\/\/\s*\^\?$/gm;
                let match;
                const results = [];
                const worker = yield sandbox.getWorkerProcess();
                if (model.isDisposed()) {
                    return {
                        hints: [],
                        dispose: () => { },
                    };
                }
                while ((match = queryRegex.exec(text)) !== null) {
                    const end = match.index + match[0].length - 1;
                    const endPos = model.getPositionAt(end);
                    const inspectionPos = new sandbox.monaco.Position(endPos.lineNumber - 1, endPos.column);
                    const inspectionOff = model.getOffsetAt(inspectionPos);
                    if (cancel.isCancellationRequested) {
                        return {
                            hints: [],
                            dispose: () => { },
                        };
                    }
                    const hint = yield worker.getQuickInfoAtPosition("file://" + model.uri.path, inspectionOff);
                    if (!hint || !hint.displayParts)
                        continue;
                    // Make a one-liner
                    let text = hint.displayParts.map(d => d.text).join("").replace(/\\n/g, "").replace(/  /g, "");
                    if (text.length > 120)
                        text = text.slice(0, 119) + "...";
                    const inlay = {
                        // @ts-ignore
                        kind: 0,
                        position: new sandbox.monaco.Position(endPos.lineNumber, endPos.column + 1),
                        label: text,
                        paddingLeft: true,
                    };
                    results.push(inlay);
                }
                return {
                    hints: results,
                    dispose: () => { },
                };
            }),
        };
        return provider;
    };
    exports.createTwoslashInlayProvider = createTwoslashInlayProvider;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHdvc2xhc2hJbmxheXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy90d29zbGFzaElubGF5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBRU8sTUFBTSwyQkFBMkIsR0FBRyxDQUFDLE9BQWdCLEVBQUUsRUFBRTtRQUM5RCxNQUFNLFFBQVEsR0FBeUQ7WUFDckUsaUJBQWlCLEVBQUUsQ0FBTyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUM1QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQzdCLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFBO2dCQUN2QyxJQUFJLEtBQUssQ0FBQTtnQkFDVCxNQUFNLE9BQU8sR0FBa0QsRUFBRSxDQUFBO2dCQUNqRSxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO2dCQUMvQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRTtvQkFDdEIsT0FBTzt3QkFDTCxLQUFLLEVBQUUsRUFBRTt3QkFDVCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztxQkFDbEIsQ0FBQTtpQkFDRjtnQkFFRCxPQUFPLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7b0JBQy9DLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7b0JBQzdDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3ZDLE1BQU0sYUFBYSxHQUFHLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUN2RixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFBO29CQUV0RCxJQUFJLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRTt3QkFDbEMsT0FBTzs0QkFDTCxLQUFLLEVBQUUsRUFBRTs0QkFDVCxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQzt5QkFDbEIsQ0FBQTtxQkFDRjtvQkFFRCxNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUE7b0JBQzNGLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWTt3QkFBRSxTQUFRO29CQUV6QyxtQkFBbUI7b0JBQ25CLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7b0JBQzdGLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHO3dCQUFFLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7b0JBRXhELE1BQU0sS0FBSyxHQUFnRDt3QkFDekQsYUFBYTt3QkFDYixJQUFJLEVBQUUsQ0FBQzt3QkFDUCxRQUFRLEVBQUUsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3dCQUMzRSxLQUFLLEVBQUUsSUFBSTt3QkFDWCxXQUFXLEVBQUUsSUFBSTtxQkFDbEIsQ0FBQTtvQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2lCQUNwQjtnQkFDRCxPQUFPO29CQUNMLEtBQUssRUFBRSxPQUFPO29CQUNkLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO2lCQUNsQixDQUFBO1lBQ0gsQ0FBQyxDQUFBO1NBQ0YsQ0FBQTtRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2pCLENBQUMsQ0FBQTtJQW5EWSxRQUFBLDJCQUEyQiwrQkFtRHZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2FuZGJveCB9IGZyb20gXCJ0eXBlc2NyaXB0bGFuZy1vcmcvc3RhdGljL2pzL3NhbmRib3hcIlxuXG5leHBvcnQgY29uc3QgY3JlYXRlVHdvc2xhc2hJbmxheVByb3ZpZGVyID0gKHNhbmRib3g6IFNhbmRib3gpID0+IHtcbiAgY29uc3QgcHJvdmlkZXI6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikubGFuZ3VhZ2VzLklubGF5SGludHNQcm92aWRlciA9IHtcbiAgICBwcm92aWRlSW5sYXlIaW50czogYXN5bmMgKG1vZGVsLCBfLCBjYW5jZWwpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBtb2RlbC5nZXRWYWx1ZSgpXG4gICAgICBjb25zdCBxdWVyeVJlZ2V4ID0gL15cXHMqXFwvXFwvXFxzKlxcXlxcPyQvZ21cbiAgICAgIGxldCBtYXRjaFxuICAgICAgY29uc3QgcmVzdWx0czogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5sYW5ndWFnZXMuSW5sYXlIaW50W10gPSBbXVxuICAgICAgY29uc3Qgd29ya2VyID0gYXdhaXQgc2FuZGJveC5nZXRXb3JrZXJQcm9jZXNzKClcbiAgICAgIGlmIChtb2RlbC5pc0Rpc3Bvc2VkKCkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBoaW50czogW10sXG4gICAgICAgICAgZGlzcG9zZTogKCkgPT4ge30sXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgd2hpbGUgKChtYXRjaCA9IHF1ZXJ5UmVnZXguZXhlYyh0ZXh0KSkgIT09IG51bGwpIHtcbiAgICAgICAgY29uc3QgZW5kID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGggLSAxXG4gICAgICAgIGNvbnN0IGVuZFBvcyA9IG1vZGVsLmdldFBvc2l0aW9uQXQoZW5kKVxuICAgICAgICBjb25zdCBpbnNwZWN0aW9uUG9zID0gbmV3IHNhbmRib3gubW9uYWNvLlBvc2l0aW9uKGVuZFBvcy5saW5lTnVtYmVyIC0gMSwgZW5kUG9zLmNvbHVtbilcbiAgICAgICAgY29uc3QgaW5zcGVjdGlvbk9mZiA9IG1vZGVsLmdldE9mZnNldEF0KGluc3BlY3Rpb25Qb3MpXG5cbiAgICAgICAgaWYgKGNhbmNlbC5pc0NhbmNlbGxhdGlvblJlcXVlc3RlZCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBoaW50czogW10sXG4gICAgICAgICAgICBkaXNwb3NlOiAoKSA9PiB7fSxcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoaW50ID0gYXdhaXQgd29ya2VyLmdldFF1aWNrSW5mb0F0UG9zaXRpb24oXCJmaWxlOi8vXCIgKyBtb2RlbC51cmkucGF0aCwgaW5zcGVjdGlvbk9mZilcbiAgICAgICAgaWYgKCFoaW50IHx8ICFoaW50LmRpc3BsYXlQYXJ0cykgY29udGludWVcblxuICAgICAgICAvLyBNYWtlIGEgb25lLWxpbmVyXG4gICAgICAgIGxldCB0ZXh0ID0gaGludC5kaXNwbGF5UGFydHMubWFwKGQgPT4gZC50ZXh0KS5qb2luKFwiXCIpLnJlcGxhY2UoL1xcXFxuL2csIFwiXCIpLnJlcGxhY2UoLyAgL2csIFwiXCIpXG4gICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA+IDEyMCkgdGV4dCA9IHRleHQuc2xpY2UoMCwgMTE5KSArIFwiLi4uXCJcblxuICAgICAgICBjb25zdCBpbmxheTogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5sYW5ndWFnZXMuSW5sYXlIaW50ID0ge1xuICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICBraW5kOiAwLFxuICAgICAgICAgIHBvc2l0aW9uOiBuZXcgc2FuZGJveC5tb25hY28uUG9zaXRpb24oZW5kUG9zLmxpbmVOdW1iZXIsIGVuZFBvcy5jb2x1bW4gKyAxKSxcbiAgICAgICAgICBsYWJlbDogdGV4dCxcbiAgICAgICAgICBwYWRkaW5nTGVmdDogdHJ1ZSxcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzLnB1c2goaW5sYXkpXG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBoaW50czogcmVzdWx0cyxcbiAgICAgICAgZGlzcG9zZTogKCkgPT4ge30sXG4gICAgICB9XG4gICAgfSxcbiAgfVxuICByZXR1cm4gcHJvdmlkZXJcbn1cbiJdfQ==