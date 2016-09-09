const fs = require("fs");
const assert = require("assert");
const {TOKEN} = require("./_token");

const utils = require("../lib/utils");
const {TelegramBot, MultipartStream} = require("../lib/telegram");

let offset = 0;

exports.setUp = function() {
    assert.isTrue(TOKEN != null, "Token missing.");

    if (fs.exists(module.resolve("offset.txt"))) {
        let storedOffset = parseInt(fs.read(module.resolve("offset.txt")), 10);
        if (!isNaN(storedOffset)) {
            offset = storedOffset;
        } else {
            assert.fail("Invalid offset! " + storedOffset);
        }
    }
};

exports.testInlineQUery = function() {
    const bot = new TelegramBot(TOKEN);
    const updates = bot.getUpdates({
        offset: offset
    });

    updates.forEach(function(update) {
        if (utils.isInlineQuery(update)) {
            let query = utils.getInlineQuery(update);

            let searchResults = [
                {
                    "type": "article",
                    "id": "http://orf.at/stories/2353452/2353453/",
                    "url": "http://orf.at/stories/2353452/2353453/",
                    "title": "Noch mehr grünes Wasser",
                    "description": "Schon die grüne Verfärbung des Wassers im Olympiabecken der Turmspringer in Rio de Janeiro hat für Verblüffung gesorgt. Jetzt sind beide Becken grün.",
                    "thumb_url": "http://orf.at/static/images/site/news/20160832/olympia_rio_kurioses_becken_dreh_pure_ap.4705004.jpg",
                    "thumb_width": 640,
                    "thumb_height": 360,
                    "input_message_content": {
                        "message_text": "Oje, noch mehr grünes Wasser in Rio!"
                    }
                }
            ];

            let result = bot.answerInlineQuery(query.id, searchResults, {
                cache_time: 5
            });

            assert.isTrue(result, "Result not okay!");
        }
    });

    if (updates.length > 0) {
        fs.write(module.resolve("offset.txt"), utils.getHighestUpdateId(updates) + 1);
    }
};

if (module == require.main) {
    require("test").run(exports);
}
