/**
 * Background script
 *
 * @copyright (c) 2017 Passbolt SARL
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */
var storage = require('./sdk/storage').storage;
window.storage = storage;

const main = async function() {
  const Config = require('./model/config');
  const {Log} = require('./model/log');
  const {GpgAuth} = require('./model/gpgauth');
  const {User} = require('./model/user');
  const {ResourceLocalStorage} = require('./service/local_storage/resourceLocalStorage');
  const {FolderLocalStorage} = require('./service/local_storage/folderLocalStorage');
  const {AuthStatusLocalStorage} = require('./service/local_storage/authStatusLocalStorage');

  /* ==================================================================================
   *  Initialization of global objects
   * ==================================================================================
   */
  Log.init();
  Config.init();
  User.init();
  ResourceLocalStorage.init();
  FolderLocalStorage.init();
  AuthStatusLocalStorage.init();

  // Web worker
  openpgp.initWorker({ path:'/vendors/openpgp.worker.js' });

  /* ==================================================================================
   *  Interface changes
   *  Where we affect the look and feel of the firefox instance
   * ==================================================================================
   */
  var ToolbarController = require('./controller/toolbarController').ToolbarController;
  new ToolbarController();

  /* ==================================================================================
   *  Page mods init
   *  Run scripts in the context of web pages whose URL matches a given pattern.
   *  see. https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/page-mod
   * ==================================================================================
   */
  var pageMods = require('./app').pageMods;

  pageMods.Bootstrap.init();

  // If the user is valid we enable the login pagemod
  var user = User.getInstance();
  if (user.isValid()) {
    // Auth pagemod init can also be triggered
    // by debug, setup and user events (e.g. when config change)
    pageMods.PassboltAuth.init();

    // App pagemod init is generally triggered after a successful login
    // We only initialize it here for the cases where the user is already logged in
    // It can happen when the extension is updated
    const auth = new GpgAuth();
    try {
      const isAuthenticated = await auth.isAuthenticated();
      if (isAuthenticated) {
        await pageMods.PassboltApp.init();
        auth.startCheckAuthStatusLoop();
      }
    } catch(error) {
      // Service unavailable
      // Do nothing...
    }
  }

  // Setup pagemods
  pageMods.SetupBootstrap.init();
  pageMods.Setup.init();

  // Other pagemods active all the time
  // but triggered by App or Auth
  pageMods.File.init();
  pageMods.Clipboard.init();
  pageMods.PassboltAuthForm.init();
  // pageMods.ShareDialog.init();
  pageMods.GroupEditDialog.init();
  pageMods.GroupEditAutocompleteDialog.init();
  pageMods.ImportPasswordsDialog.init();
  pageMods.ExportPasswordsDialog.init();
  pageMods.QuickAccess.init();
  pageMods.ReactApp.init();

  // Debug pagemod
  if (Config.isDebug()) {
    pageMods.Debug.init();
    pageMods.DebugPage.init();
  }

};

// Init storage and get going.
storage.init()
  .then(function () {
    main();
  });
