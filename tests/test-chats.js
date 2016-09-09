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

exports.testChatting = function() {
    const bot = new TelegramBot(TOKEN);
    const updates = bot.getUpdates({
        offset: offset
    });

    updates.forEach(function(update) {
        if (update.message) {
            let chatId = utils.getChatIdFromMessage(update);

            let photo = new MultipartStream("test.jpg", new fs.Path(module.resolve("./fixtures/test.jpg")));
            let result = bot.sendPhoto(chatId, photo);
            assert.isTrue(result.message_id != null, "Message ID missing!");

            let audio = new MultipartStream("audio.mp3", new fs.Path(module.resolve("./fixtures/audio.mp3")));
            result = bot.sendAudio(chatId, audio);
            assert.isTrue(result.message_id != null, "Message ID missing!");

            let video = new MultipartStream("video.mp4", new fs.Path(module.resolve("./fixtures/video.mp4")));
            result = bot.sendVideo(chatId, video);
            assert.isTrue(result.message_id != null, "Message ID missing!");

            let doc = new MultipartStream("document.pdf", new fs.Path(module.resolve("./fixtures/document.pdf")));
            result = bot.sendDocument(chatId, doc);
            assert.isTrue(result.message_id != null, "Message ID missing!");

            let sticker = new MultipartStream("ringojs.webp", new fs.Path(module.resolve("./fixtures/ringojs.webp")));
            result = bot.sendSticker(chatId, sticker);
            assert.isTrue(result.message_id != null, "Message ID missing!");

            let voice = new MultipartStream("voice.ogg", new fs.Path(module.resolve("./fixtures/voice.ogg")));
            result = bot.sendVoice(chatId, voice);
            assert.isTrue(result.message_id != null, "Message ID missing!");

            result = bot.sendLocation(chatId, 48.242766, 16.364305);
            assert.isTrue(result.message_id != null, "Message ID missing!");

            result = bot.sendVenue(chatId, 48.223507, 16.499520, "Coworking Seestern Aspern", "Gisela-Legath-Gasse 5/1, 1220 Wien", {
                "foursquare_id": "55c73bc4498e157e092f859e"
            });
            assert.isTrue(result.message_id != null, "Message ID missing!");

            bot.sendChatAction(chatId, "typing");

            // wait some time
            try {
                java.lang.Thread.sleep(3500);
            } catch (e) {
                assert.fail("Exception thrown during Thread.sleep()");
            }

            result = bot.sendContact(chatId, "+43 (1) 50277-21300", "ORF Online & Teletext GmbH & Co KG");
            assert.isTrue(result.message_id != null, "Message ID missing!");
        }
    });

    if (updates.length > 0) {
        fs.write(module.resolve("offset.txt"), utils.getHighestUpdateId(updates) + 1);
    }
};

if (module == require.main) {
    require("test").run(exports);
}
