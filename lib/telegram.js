"use strict";

/**
 * @fileoverview The Telegram Bot client for RingoJS. It provides a convenient interface to
 * the HTTP-based bot API. Required parameters for each API call are also required function parameters
 * in this library. For all optional parameters an additional `options` parameter object will be used.
 * @see <a href="https://core.telegram.org/bots/api">Telegram Bot API documentation</a>
 */

let {Stream, TextStream} = require("io");

const {Path, openRaw} = require("fs");
const {request, TextPart, BinaryPart} = require("ringo/httpclient");
const objects = require("ringo/utils/objects");

/**
 * Object to wrap file uploads to Telegram via `multipart/form-data`.
 * The input can be a `Stream` for binary reading or a `Path` to the file.
 * @param {string} name the name of the file
 * @param {io.Stream|fs.Path} source input binary stream or a path to the file
 * @constructor
 */
const MultipartStream = exports.MultipartStream = function(name, source) {
    if (name == null || (!(source instanceof Stream) && !(source instanceof Path))) {
        throw new Error("Invalid parameters for MultipartStream.");
    }

    this.name = name;
    this.stream = (source instanceof Stream ? source : openRaw(source, "r"));
};


/**
 * A Telegram Bot API client. It manages the HTTPS-based communication with the API endpoint.
 * @param {string} token the bot's unique authentication token
 * @constructor
 */
const TelegramBot = exports.TelegramBot = function(token) {
    const baseURI = "https://api.telegram.org/bot" + token;

    const processExchange = function(exchange) {
        if(exchange.status !== 200) {
            throw new Error("Telegram Bot API returned status: " + exchange.status + "; " + exchange.content);
        }

        try {
            const resp = JSON.parse(exchange.content);
            if (resp.ok === true) {
                return resp.result;
            } else {
                throw new Error("Telegram API error code " + resp.error_code + "; " + resp.description);
            }
        } catch (e) {
            throw new Error("Could not parse JSON response by Telegram Bot API: " + e);
        }
    };

    /**
     * @ignore
     */
    this._request = function(path, payload) {
        if (payload != null && !payload instanceof  Object) {
            throw new Error("Invalid payload for Telegram API: " + typeof obj);
        }

        return processExchange(request({
            url: baseURI + path,
            method: "POST",
            data: payload ? JSON.stringify(payload) : "",
            headers: {
                "Cache-Control": "no-cache, no-store",
                "Content-Type": "application/json; charset=utf-8"
            }
        }));
    };

    /**
     * @ignore
     */
    this._requestMultipart = function(path, payload) {
        if (payload != null && !payload instanceof  Object) {
            throw new Error("Invalid payload for Telegram API: " + typeof obj);
        }

        const multipartPayload = {};
        for (let name in payload) {
            if (payload[name] instanceof MultipartStream) {
                let multiStream = payload[name];
                if (multiStream.stream instanceof TextStream) {
                    multipartPayload[name] = new TextPart(multiStream.stream, "utf-8", multiStream.name)
                } else {
                    multipartPayload[name] = new BinaryPart(multiStream.stream, multiStream.name);
                }
            } else {
                multipartPayload[name] = new TextPart(String(payload[name]), "utf-8");
            }
        }

        try {
            return processExchange(request({
                url: baseURI + path,
                method: "POST",
                data: multipartPayload,
                headers: {
                    "Cache-Control": "no-cache, no-store",
                    "Content-Type": "multipart/form-data"
                }
            }));
        } finally {
            for (let name in payload) {
                if (payload[name] instanceof MultipartStream && !payload[name].stream.closed()) {
                    payload[name].stream.close();
                }
            }
        }
    }
};

/**
 * Registers a webhook for the bot. The provided URL must be using HTTPS for secure communication.
 * @param {string} url the bot's HTTPS callback URL. An empty string removes the webhook.
 * @param {MultipartStream} cert optional self-signed public key certificate
 * @see <a href="https://core.telegram.org/bots/api#setwebhook">Telegram Bot API - setWebhook</a>
 */
TelegramBot.prototype.setWebhook = function(url, cert) {
    if (cert != null) {
        return this._request("/setWebhook", {
            "url": url
        });
    }

    return this._requestMultipart("/setWebhook", {
        "url": url,
        "cert": cert
    });
};

/**
 * Retrieves updates using long polling requests.
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#getupdates">Telegram Bot API - getUpdates</a>
 */
TelegramBot.prototype.getUpdates = function(options) {
    return this._request("/getUpdates", options);
};

/**
 * Test method to verify the auth token is working. Returns basic information about the bot.
 * @see <a href="https://core.telegram.org/bots/api#getme">Telegram Bot API - getMe</a>
 */
TelegramBot.prototype.getMe = function() {
    return this._request("/getMe");
};

/**
 * Sends a text message. On success, the sent message is returned.
 * @param {number|string} chatId identifier for the target chat
 * @param {string} text message text
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendmessage">Telegram Bot API - sendMessage</a>
 */
TelegramBot.prototype.sendMessage = function(chatId, text, options) {
    if (chatId == null || text == null) {
        throw new Error("Insufficient parameters for /sendMessage");
    }

    return this._request("/sendMessage", objects.merge({
        "chat_id": chatId,
        "text": text
    }, options));
};

/**
 * Answers inline queries for inline-enabled bots. No more than 50 results per query are allowed.
 * @param {numer|string} inlineQueryId the query id
 * @param {Array} results array of `InlineQueryResult` objects
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#answerinlinequery">Telegram Bot API - answerInlineQuery</a>
 * @example updates.forEach(function(update) {
  if (utils.isInlineQuery(update)) {
    let query = utils.getInlineQuery(update);

    let searchResults = [
      {
        "type": "article",
        "id": "http://orf.at/stories/2353452/2353453/",
        "url": "http://orf.at/stories/2353452/2353453/",
        "title": "Noch mehr grünes Wasser",
        "description": "Jetzt sind beide Becken grün.",
        "thumb_url": "http://orf.at/static/4705004.jpg",
        "thumb_width": 640,
        "thumb_height": 360,
        "input_message_content": {
          "message_text": "Oje, noch mehr grünes Wasser!"
        }
      }
    ];

    bot.answerInlineQuery(query.id, searchResults, {
      cache_time: 5
    });
  }
});
 */
TelegramBot.prototype.answerInlineQuery = function(inlineQueryId, results, options) {
    if (inlineQueryId == null || results == null || !results instanceof Array) {
        throw new Error("Insufficient parameters for /answerInlineQuery");
    }

    return this._request("/answerInlineQuery", objects.merge({
        "inline_query_id": inlineQueryId,
        "results": results
    }, options));
};

/**
 * Forwards messages of any kind to another chat.
 * @param {number|string} chatId target chat id
 * @param {number|string} fromChatId source chat id
 * @param {number|string} messageId message id from the source chat
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#forwardmessage">Telegram Bot API - forwardMessage</a>
 */
TelegramBot.prototype.forwardMessage = function(chatId, fromChatId, messageId, options) {
    if (chatId == null || fromChatId == null || messageId == null) {
        throw new Error("Insufficient parameters for /forwardMessage");
    }

    return this._request("/forwardMessage", objects.merge({
        "chat_id": chatId,
        "from_chat_id": fromChatId,
        "message_id": messageId
    }, options));
};

/**
 * Sends a photo to a chat.
 * @param {number|string} chatId target chat id
 * @param {MultipartStream} photo multipart photo object
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendphoto">Telegram Bot API - sendPhoto</a>
 */
TelegramBot.prototype.sendPhoto = function(chatId, photo, options) {
    if (chatId == null || photo == null) {
        throw new Error("Insufficient parameters for /sendPhoto");
    }

    return this._requestMultipart("/sendPhoto", objects.merge({
        "chat_id": chatId,
        "photo": photo
    }, options));
};

/**
 * Sends an audio message to a chat.
 * @param {number|string} chatId target chat id
 * @param {MultipartStream} audio multipart audio object
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendaudio">Telegram Bot API - sendAudio</a>
 */
TelegramBot.prototype.sendAudio = function(chatId, audio, options) {
    if (chatId == null || audio == null) {
        throw new Error("Insufficient parameters for /sendAudio");
    }

    return this._requestMultipart("/sendAudio", objects.merge({
        "chat_id": chatId,
        "audio": audio
    }, options));
};

/**
 * Sends a document to a chat.
 * @param {number|string} chatId target chat id
 * @param {MultipartStream} document multipart document object
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#senddocument">Telegram Bot API - sendDocument</a>
 */
TelegramBot.prototype.sendDocument = function(chatId, document, options) {
    if (chatId == null || document == null) {
        throw new Error("Insufficient parameters for /sendDocument");
    }

    return this._requestMultipart("/sendDocument", objects.merge({
        "chat_id": chatId,
        "document": document
    }, options));
};

/**
 * Sends a `.webp` sticker to a chat.
 * @param {number|string} chatId target chat id
 * @param {MultipartStream} sticker multipart sticker object
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendsticker">Telegram Bot API - sendSticker</a>
 */
TelegramBot.prototype.sendSticker = function(chatId, sticker, options) {
    if (chatId == null || sticker == null) {
        throw new Error("Insufficient parameters for /sendSticker");
    }

    return this._requestMultipart("/sendSticker", objects.merge({
        "chat_id": chatId,
        "sticker": sticker
    }, options));
};

/**
 * Sends a `mp4` video to the chat.
 * @param {number|string} chatId target chat id
 * @param {MultipartStream} video multipart video object
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendvideo">Telegram Bot API - sendVideo</a>
 */
TelegramBot.prototype.sendVideo = function(chatId, video, options) {
    if (chatId == null || video == null) {
        throw new Error("Insufficient parameters for /sendVideo");
    }

    return this._requestMultipart("/sendVideo", objects.merge({
        "chat_id": chatId,
        "video": video
    }, options));
};

/**
 * Sends a voice message encoded with ogg and the low-latency Opus lossy audio coding format.
 * @param {number|string} chatId target chat id
 * @param {MultipartStream} voice multipart voice recording object
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendvoice">Telegram Bot API - sendVoice</a>
 */
TelegramBot.prototype.sendVoice = function(chatId, voice, options) {
    if (chatId == null || voice == null) {
        throw new Error("Insufficient parameters for /sendVoice");
    }

    return this._requestMultipart("/sendVoice", objects.merge({
        "chat_id": chatId,
        "voice": voice
    }, options));
};

/**
 * Sends a point on a map.
 * @param {number|string} chatId target chat id
 * @param {number} latitude numeric latitude
 * @param {number} longitude numeric longitude
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendlocation">Telegram Bot API - sendLocation</a>
 */
TelegramBot.prototype.sendLocation = function(chatId, latitude, longitude, options) {
    if (chatId == null || latitude == null || longitude == null) {
        throw new Error("Insufficient parameters for /sendLocation");
    }

    return this._request("/sendLocation", objects.merge({
        "chat_id": chatId,
        "latitude": latitude,
        "longitude": longitude
    }, options));
};

/**
 * Sends detailed information about a venue.
 * @param {number|string} chatId target chat id
 * @param {number} latitude numeric latitude
 * @param {number} longitude numeric longitude
 * @param {string} title venue name or title
 * @param {string} address detailed address of the venue
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendvenue">Telegram Bot API - sendVenue</a>
 */
TelegramBot.prototype.sendVenue = function(chatId, latitude, longitude, title, address, options) {
    if (chatId == null || latitude == null || longitude == null || title == null || address == null) {
        throw new Error("Insufficient parameters for /sendVenue");
    }

    return this._request("/sendVenue", objects.merge({
        "chat_id": chatId,
        "latitude": latitude,
        "longitude": longitude,
        "title": title,
        "address": address
    }, options));
};

/**
 * Sends a contact. The optional `last_name` has to be sent in the additional parameters.
 * @param {number|string} chatId target chat id
 * @param {string} phoneNumber phone number as string
 * @param {string} firstName contact's first name
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#sendcontact">Telegram Bot API - sendContact</a>
 */
TelegramBot.prototype.sendContact = function(chatId, phoneNumber, firstName, options) {
    if (chatId == null || phoneNumber == null || firstName == null) {
        throw new Error("Insufficient parameters for /sendContact");
    }

    return this._request("/sendContact", objects.merge({
        "chat_id": chatId,
        "phone_number": phoneNumber,
        "first_name": firstName
    }, options));
};

/**
 * Sends a work in progress indicator to the user. This might be useful if the bot needs more time
 * to answer a specific message by the user.
 * @param {number|string} chatId target chat id
 * @param {string} action type of action or response a user will see in the future
 * @see <a href="https://core.telegram.org/bots/api#sendchataction">Telegram Bot API - sendChatAction</a>
 */
TelegramBot.prototype.sendChatAction = function(chatId, action) {
    if (chatId == null || action == null) {
        throw new Error("Insufficient parameters /sendChatAction");
    }

    return this._request("/sendChatAction", {
        "chat_id": chatId,
        "action": action
    });
};

/**
 * Retrieves a list of profile pictures for a user.
 * @param {number|string} userId user identifier
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#getuserprofilephotos">Telegram Bot API - getUserProfilePhotos</a>
 */
TelegramBot.prototype.getUserProfilePhotos = function(userId, options) {
    if (userId == null) {
        throw new Error("Insufficient parameters for /getUserProfilePhotos");
    }

    return this._request("/getUserProfilePhotos", objects.merge({
        "user_id": userId
    }, options));
};

/**
 * Retrieves basic information about the requested file and prepares it for downloading.
 * @param {string} fileId
 * @see <a href="https://core.telegram.org/bots/api#getfile">Telegram Bot API - getFile</a>
 */
TelegramBot.prototype.getFile = function(fileId) {
    if (getFile == null) {
        throw new Error("Insufficient parameters for /getFile");
    }

    return this._request("/getFile", {
        "file_id": fileId
    });
};

/**
 * Kicks a user from a group or a supergroup.
 * @param {number|string} chatId target chat id
 * @param {number|string} userId user to kick
 * @see <a href="https://core.telegram.org/bots/api#kickchatmember">Telegram Bot API - kickChatMember</a>
 */
TelegramBot.prototype.kickChatMember = function(chatId, userId) {
    if (chatId == null || userId == null) {
        throw new Error("Insufficient parameters for /kickChatMember");
    }

    return this._request("/kickChatMember", {
        "chat_id": chatId,
        "user_id": userId
    });
};

/**
 * Lets a bot leave a group, supergroup or channel. The method returns `true` on success.
 * @param {number|string} chatId target chat id
 * @see <a href="https://core.telegram.org/bots/api#leavechat">Telegram Bot API - leaveChat</a>
 */
TelegramBot.prototype.leaveChat = function(chatId) {
    if (chatId == null) {
        throw new Error("Insufficient parameters for /leaveChat");
    }

    return this._request("/leaveChat", {
        "chat_id": chatId
    });
};

/**
 * Annuls a ban of a chat member for the given supergroup. The user must join again via a link or invite.
 * @param {number|string} chatId the target chat id
 * @param {number|string} userId user to unban
 * @see <a href="https://core.telegram.org/bots/api#unbanchatmember">Telegram Bot API - unbanChatMember</a>
 */
TelegramBot.prototype.unbanChatMember = function(chatId, userId) {
    if (chatId == null || userId == null) {
        throw new Error("Insufficient parameters for /unbanChatMember");
    }

    return this._request("/unbanChatMember", {
        "chat_id": chatId,
        "user_id": userId
    });
};

/**
 * Retrieves detailed information about the given chat
 * @param {number|string} chatId target chat or username of the target supergroup or channel (in the format `@channelusername`)
 * @see <a href="https://core.telegram.org/bots/api#getchat">Telegram Bot API - getChat</a>
 */
TelegramBot.prototype.getChat = function(chatId) {
    if (chatId == null) {
        throw new Error("Insufficient parameters for /getChat");
    }

    return this._request("/getChat", {
        "chat_id": chatId
    });
};

/**
 * Retrieves an array with a list of administrators in a chat.
 * @param {number|string} chatId target chat id
 * @see <a href="https://core.telegram.org/bots/api#getchatadministrators">Telegram Bot API - getChatAdministrators</a>
 */
TelegramBot.prototype.getChatAdministrators = function(chatId) {
    if (chatId == null) {
        throw new Error("Insufficient parameters for /getChatAdministrators");
    }

    return this._request("/getChatAdministrators", {
        "chat_id": chatId
    });
};

/**
 * Returns an integer number of members in a chat.
 * @param {number|string} chatId target chat id
 * @see <a href="https://core.telegram.org/bots/api#getchatmemberscount">Telegram Bot API - getChatMembersCount</a>
 */
TelegramBot.prototype.getChatMembersCount = function(chatId) {
    if (chatId == null) {
        throw new Error("Insufficient parameters for /getChatMembersCount");
    }

    return this._request("/getChatMembersCount", {
        "chat_id": chatId
    });
};

/**
 * Retrieves information about a member of a chat.
 * @param {number|string} chatId target chat id
 * @param {number|string} userId user identifier
 * @see <a href="https://core.telegram.org/bots/api#getchatmember">Telegram Bot API - getChatMember</a>
 */
TelegramBot.prototype.getChatMember = function(chatId, userId) {
    if (chatId == null || userId == null) {
        throw new Error("Insufficient parameters for /getChatMember");
    }

    return this._request("/getChatMember", {
        "chat_id": chatId,
        "user_id": userId
    });
};

/**
 * Sends answers to callback queries sent from inline keyboards.
 * @param {number|string} callbackQueryId unique callback query identifier to answer to
 * @param {Object} options optional parameters
 * @see <a href="https://core.telegram.org/bots/api#answercallbackquery">Telegram Bot API - answerCallbackQuery</a>
 */
TelegramBot.prototype.answerCallbackQuery = function(callbackQueryId, options) {
    if (callbackQueryId == null) {
        throw new Error("Insufficient parameters for /answerCallbackQuery");
    }

    return this._request("/answerCallbackQuery", objects.merge({
        "callback_query_id": callbackQueryId
    }, options));
};

/**
 * Edits text messages sent by the bot or via the bot in inline queries.
 * @param {string} text the new text
 * @param {Object} options optional parameters depending on the type of message to update
 * @see <a href="https://core.telegram.org/bots/api#editmessagetext">Telegram Bot API - editMessageText</a>
 */
TelegramBot.prototype.editMessageText = function(text, options) {
    if (text == null || options == null) {
        throw new Error("Insufficient parameters for /editMessageText");
    }

    return this._request("/editMessageText", objects.merge({
        "text": text
    }, options));
};

/**
 * Edits captions of messages sent by the bot or via the bot for inline bots.
 * @param {Object} options optional parameters depending on the type of message to update
 * @see <a href="https://core.telegram.org/bots/api#editmessagecaption">Telegram Bot API - editMessageCaption</a>
 */
TelegramBot.prototype.editMessageCaption = function(options) {
    if (options) {
        throw new Error("Insufficient parameters for /editMessageCaption");
    }

    return this._request("/editMessageCaption", objects);
};

/**
 * Edits only the reply markup of messages sent by the bot or via the bot for inline bots.
 * @param {Object} options optional parameters depending on the type of message to update
 * @see <a href="https://core.telegram.org/bots/api#editmessagereplymarkup">Telegram Bot API - editMessageReplyMarkup</a>
 */
TelegramBot.prototype.editMessageReplyMarkup = function(options) {
    if (options == null) {
        throw new Error("Insufficient parameters for /editMessageReplyMarkup");
    }

    return this._request("/editMessageReplyMarkup", options);
};
