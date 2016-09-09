const assert = require("assert");
const {TOKEN} = require("./_token");

const {TelegramBot} = require("../lib/telegram");

exports.setUp = function() {
    assert.isTrue(TOKEN != null, "Token missing.");
};

exports.testGetMe = function() {
    const bot = new TelegramBot(TOKEN);
    const result = bot.getMe();

    assert.isTrue(result.id > 0, "Bot ID not a valid integer");
    assert.isNotNull(result.first_name, "Bot name missing");
    assert.isNotNull(result.username, "Bot username missing");
    assert.isTrue(result.username.toLocaleLowerCase().indexOf("bot") > 1, "Bot name missing");
};

if (module == require.main) {
    require("test").run(exports);
}
