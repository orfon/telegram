"use strict";

/**
 * @fileoverview Utility functions to interact with the Telegram API and the bot client.
 */

/**
 * Searches for the highest update id. Useful for the long-polling API via `getUpdates()`.
 * @param {Array} updates an array of updates
 * @return {number} the highest update id from the given updates
 */
exports.getHighestUpdateId = function(updates) {
    return updates.reduce(function(max, update) {
        return update.update_id > max ? update.update_id : max;
    }, 0);
};

/**
 * Extracts the chat id from a message
 * @param {Object} envelope the message itself
 * @return {number|string} the chat id or null, if not found.
 */
exports.getChatIdFromMessage = function(envelope) {
    if (envelope.message !== undefined) {
        return envelope.message.chat.id;
    } else if (envelope.chat !== undefined) {
        return envelope.chat.id;
    }

    return null;
};

/**
 * Returns the inline query object of an update.
 * @param {Object} update
 * @return {Object} the inline query
 */
exports.getInlineQuery = function(update) {
    return update.inline_query;
};

/**
 * Returns true if the update is an inline query.
 * @param {Object} update
 * @return {boolean} true, if it's an inline query.
 */
exports.isInlineQuery = function(update) {
    return update.inline_query !== undefined;
};
