import { Time } from "@dendronhq/common-all";
import { AssertUtils } from "@dendronhq/common-test-utils";
import { ENGINE_HOOKS_MULTI } from "@dendronhq/engine-test-utils";
import _ from "lodash";
import { DateTime } from "luxon";
import { describe } from "mocha";
import sinon from "sinon";
import * as vscode from "vscode";
import { NoteSyncService } from "../../services/NoteSyncService";
import { VSCodeUtils } from "../../utils";
import { expect } from "../testUtilsv2";
import { runLegacyMultiWorkspaceTest, setupBeforeAfter } from "../testUtilsV3";

suite("NoteSyncService", function () {
  let ctx: vscode.ExtensionContext;
  let newUpdatedTime: number;
  ctx = setupBeforeAfter(this, {
    beforeHook: () => {
      newUpdatedTime = 60000;
      sinon.stub(Time, "now").returns(DateTime.fromMillis(newUpdatedTime));
    },
    afterHook: () => {
      sinon.restore();
    }
  });

  describe("onDidChange", () => {
    test("ok: onDidChange: change", (done) => {
      runLegacyMultiWorkspaceTest({
        ctx,
        postSetupHook: ENGINE_HOOKS_MULTI.setupBasicMulti,
        onInit: async ({ engine }) => {
          const foo = engine.notes["foo"];
          const editor = await VSCodeUtils.openNote(foo);
          await editor?.edit((builder) => {
            const pos = new vscode.Position(10, 0);
            const selection = new vscode.Selection(pos, pos);
            builder.replace(selection, `Hello`);
          });
          const uri = editor.document.uri;
          const resp = await NoteSyncService.instance().onDidChange(uri);
          expect(resp?.contentHash).toEqual("726bb8a80a207bba30a640e39bf95ebe");
          expect(resp?.updated).toEqual(newUpdatedTime);
          expect(
            await AssertUtils.assertInString({
              body: engine.notes["foo"].body,
              match: ["Hello"],
            })
          ).toBeTruthy();
          done();
        },
      });
    });

    test("onDidChange: no change", (done) => {
      runLegacyMultiWorkspaceTest({
        ctx,
        postSetupHook: ENGINE_HOOKS_MULTI.setupBasicMulti,
        onInit: async ({ engine }) => {
          const foo = engine.notes["foo"];
          const editor = await VSCodeUtils.openNote(foo);
          const uri = editor.document.uri;
          const resp = await NoteSyncService.instance().onDidChange(uri);
          expect(_.isUndefined(resp)).toBeTruthy();
          done();
        },
      });
    });
  });
});