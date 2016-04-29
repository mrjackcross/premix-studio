'use strict';

var request = require('request')
var Q = require('q')
var deferredReq = Q.nfbind(request)

/**
 *
 * Omnify search uses a combination of Spotify and Omnifone
 * endpoints to construct results
 *
 **/
function getOmnifySearch(req, res) {
    var searchTerm = req.swagger.params.q.value;

    var results = {
        results: [
            {
                trackName: searchTerm,
                trackArtist: searchTerm,
                trackImageUrl: searchTerm,
                trackUrl: searchTerm,
                trackLength: searchTerm,
                trackBpm: searchTerm
            }
        ]
    };

    res.json(results);
}

module.exports = {
    getOmnifySearch: getOmnifySearch
};