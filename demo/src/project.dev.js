require = function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = "function" == typeof require && require;
        if (!u && a) return a(o, !0);
        if (i) return i(o, !0);
        var f = new Error("Cannot find module '" + o + "'");
        throw f.code = "MODULE_NOT_FOUND", f;
      }
      var l = n[o] = {
        exports: {}
      };
      t[o][0].call(l.exports, function(e) {
        var n = t[o][1][e];
        return s(n || e);
      }, l, l.exports, e, t, n, r);
    }
    return n[o].exports;
  }
  var i = "function" == typeof require && require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s;
}({
  HotUpdate: [ function(require, module, exports) {
    "use strict";
    cc._RF.push(module, "fc8fbywMB1Br4vynJ7OzJN5", "HotUpdate");
    "use strict";
    cc.Class({
      extends: cc.Component,
      properties: {
        label: cc.Label,
        manifestUrl: cc.RawAsset,
        fileProgress: cc.ProgressBar,
        fileLabel: cc.Label,
        byteProgress: cc.ProgressBar,
        byteLabel: cc.Label,
        _updating: false,
        _canRetry: false,
        _storagePath: ""
      },
      checkCb: function checkCb(event) {
        cc.log("Code: " + event.getEventCode());
        switch (event.getEventCode()) {
         case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
          this.label.string = "No local manifest file found, hot update skipped.";
          break;

         case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
         case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
          this.label.string = "Fail to download manifest file, hot update skipped.";
          break;

         case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
          this.label.string = "Already up to date with the latest remote version.";
          break;

         case jsb.EventAssetsManager.NEW_VERSION_FOUND:
          this.label.string = "New version found, please try to update.";
          this.fileProgress.progress = 0;
          this.byteProgress.progress = 0;
          break;

         default:
          return;
        }
        cc.eventManager.removeListener(this._checkListener);
        this._checkListener = null;
        this._updating = false;
      },
      updateCb: function updateCb(event) {
        var needRestart = false;
        var failed = false;
        switch (event.getEventCode()) {
         case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
          this.label.string = "No local manifest file found, hot update skipped.";
          failed = true;
          break;

         case jsb.EventAssetsManager.UPDATE_PROGRESSION:
          this.byteProgress.progress = event.getPercent();
          this.fileProgress.progress = event.getPercentByFile();
          this.fileLabel.string = event.getDownloadedFiles() + " / " + event.getTotalFiles();
          this.byteLabel.string = event.getDownloadedBytes() + " / " + event.getTotalBytes();
          var msg = event.getMessage();
          msg && (this.label.string = "Updated file: " + msg);
          break;

         case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
         case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
          this.label.string = "Fail to download manifest file, hot update skipped.";
          failed = true;
          break;

         case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
          this.label.string = "Already up to date with the latest remote version.";
          failed = true;
          break;

         case jsb.EventAssetsManager.UPDATE_FINISHED:
          this.label.string = "Update finished. " + event.getMessage();
          needRestart = true;
          break;

         case jsb.EventAssetsManager.UPDATE_FAILED:
          this.label.string = "Update failed. " + event.getMessage();
          this._updating = false;
          this._canRetry = true;
          break;

         case jsb.EventAssetsManager.ERROR_UPDATING:
          this.label.string = "Asset update error: " + event.getAssetId() + ", " + event.getMessage();
          break;

         case jsb.EventAssetsManager.ERROR_DECOMPRESS:
          this.label.string = event.getMessage();
        }
        if (failed) {
          cc.eventManager.removeListener(this._updateListener);
          this._updateListener = null;
          this._updating = false;
        }
        if (needRestart) {
          cc.eventManager.removeListener(this._updateListener);
          this._updateListener = null;
          var searchPaths = jsb.fileUtils.getSearchPaths();
          var newPaths = this._am.getLocalManifest().getSearchPaths();
          console.log(JSON.stringify(newPaths));
          Array.prototype.unshift(searchPaths, newPaths);
          cc.sys.localStorage.setItem("HotUpdateSearchPaths", JSON.stringify(searchPaths));
          jsb.fileUtils.setSearchPaths(searchPaths);
          cc.audioEngine.stopAll();
          cc.game.restart();
        }
      },
      loadCustomManifest: function loadCustomManifest() {
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
          var manifest = new jsb.Manifest(customManifestStr, this._storagePath);
          this._am.loadLocalManifest(manifest, this._storagePath);
          this.label.string = "Using custom manifest";
        }
      },
      retry: function retry() {
        if (!this._updating && this._canRetry) {
          this._canRetry = false;
          this.label.string = "Retry failed Assets...";
          this._am.downloadFailedAssets();
        }
      },
      checkUpdate: function checkUpdate() {
        if (this._updating) {
          this.label.string = "Checking or updating ...";
          return;
        }
        this._am.getState() === jsb.AssetsManager.State.UNINITED && this._am.loadLocalManifest(this.manifestUrl);
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {
          this.label.string = "Failed to load local manifest ...";
          return;
        }
        this._checkListener = new jsb.EventListenerAssetsManager(this._am, this.checkCb.bind(this));
        cc.eventManager.addListener(this._checkListener, 1);
        this._am.checkUpdate();
        this._updating = true;
      },
      hotUpdate: function hotUpdate() {
        if (this._am && !this._updating) {
          this._updateListener = new jsb.EventListenerAssetsManager(this._am, this.updateCb.bind(this));
          cc.eventManager.addListener(this._updateListener, 1);
          this._am.getState() === jsb.AssetsManager.State.UNINITED && this._am.loadLocalManifest(this.manifestUrl);
          this._failCount = 0;
          this._am.update();
          this._updating = true;
        }
      },
      onLoad: function onLoad() {
        if (!cc.sys.isNative) return;
        this._storagePath = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/") + "blackjack-remote-asset";
        cc.log("Storage path for remote asset : " + this._storagePath);
        this.versionCompareHandle = function(versionA, versionB) {
          cc.log("JS Custom Version Compare: version A is " + versionA + ", version B is " + versionB);
          var vA = versionA.split(".");
          var vB = versionB.split(".");
          for (var i = 0; i < vA.length; ++i) {
            var a = parseInt(vA[i]);
            var b = parseInt(vB[i] || 0);
            if (a === b) continue;
            return a - b;
          }
          return vB.length > vA.length ? -1 : 0;
        };
        this._am = new jsb.AssetsManager("", this._storagePath, this.versionCompareHandle);
        cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS || this._am.retain();
        this._am.setVerifyCallback(function(path, asset) {
          var compressed = asset.compressed;
          var expectedMD5 = asset.md5;
          var relativePath = asset.path;
          var size = asset.size;
          if (compressed) {
            this.label.string = "Verification passed : " + relativePath;
            return true;
          }
          this.label.string = "Verification passed : " + relativePath + " (" + expectedMD5 + ")";
          return true;
        }.bind(this));
        this.label.string = "Hot update is ready, please check or directly update.";
        if (cc.sys.os === cc.sys.OS_ANDROID) {
          this._am.setMaxConcurrentTask(2);
          this.label.string = "Max concurrent tasks count have been limited to 2";
        }
        this.fileProgress.progress = 0;
        this.byteProgress.progress = 0;
      },
      onDestroy: function onDestroy() {
        if (this._updateListener) {
          cc.eventManager.removeListener(this._updateListener);
          this._updateListener = null;
        }
        this._am && !cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS && this._am.release();
      }
    });
    cc._RF.pop();
  }, {} ]
}, {}, [ "HotUpdate" ]);