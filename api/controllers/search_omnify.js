'use strict';
var Config = require('../../config/config');
var async = require('async');
var request = require('request');

var spotifyEndpoint = 'https://api.spotify.com/v1/';
var spotifyAuthUrl = 'https://accounts.spotify.com/api/token';
var spotifyAppId = new Buffer(Config.spotifyClientId + ':' + Config.spotifyClientSecret).toString('base64');
var omniSearchUri = '/1/search/query.json?countryCode=US&searchAttribute=combinedName&distinct=true&limit=1&index=track';
var omniAudioUri = '/1/content/audio/trusted/';
var audioEncoding = '320-heaac-3gpp'; // doesn't have to be this one
var audioParams = '?countryCode=US&customerId=T_jcross&apiKey=' + Config.omniAppKey;

var results = [];
var spotifyAccessToken = '';
/**
 *
 * Omnify search uses a combination of Spotify and Omnifone
 * endpoints to construct results
 *
 **/
function getOmnifySearch(req, res) {
    var getOmnifySearchResponse = res;
    var searchTerm = req.swagger.params.q.value;
    var spotifySearchUri = 'search?type=track&limit=10&q=' + searchTerm;


    request.post({
        url: spotifyAuthUrl,
        headers: {
            'content-type': 'application/json',
            'Authorization': 'Basic ' + spotifyAppId
        },
        form: {
            grant_type: 'client_credentials'
        }
    }, function (err, res, body) {

        var body = JSON.parse(body);

        spotifyAccessToken = body['access_token'];

        request({
            url: spotifyEndpoint + spotifySearchUri,
            headers: {
                'Authorization': 'Bearer ' + spotifyAccessToken
            }
        }, function(err, res, body) {

            var body = JSON.parse(body);

            var echoNestUrls = body.tracks.items.map(function (track) {
                return spotifyEndpoint + 'audio-features/' + track.id;
            });

            var omniUrls = body.tracks.items.map(function (track) {

                var result = {
                    id: track.id,
                    trackName: track.name,
                    trackArtist: track.artists[0].name,
                    trackImageUrl: track.album.images[2].url,
                    trackLength: track.duration_ms,
                    trackPreviewUrl: track.preview_url
                };

                results.push(result);

                var matchTerm = (track.artists[0].name + ' ' + track.name).replace(/[^A-Za-z0-9 ]/g, '');
                return encodeURI(Config.omniEndPoint + omniSearchUri + '&query=' + matchTerm + '&apiKey=' + Config.omniAppKey);
            });

            async.forEachOf(omniUrls, getOmnifoneContentUrl, function (err, res){

                if (err) {
                    return console.log(err);
                }

                async.forEachOf(echoNestUrls, getAudioFeatures, function (err, res) {

                    if (err) {
                        return console.log(err);
                    }

                    getOmnifySearchResponse.json({
                        results: results
                    });
                    results = [];
                    spotifyAccessToken = '';
                });

            });

        });

    });
}

function getOmnifoneContentUrl(url, i, callback) {

    request(url, function(err, res, body) {

        var body = JSON.parse(body);
        if(typeof body.trackIds !== 'undefined' && body.trackIds.length > 0) {
        var omniTrackId = body.trackIds[0].trackId;
            results[i].trackUrl = Config.omniEndPoint + omniAudioUri + audioEncoding + '/urls/' + omniTrackId + '.json' + audioParams;
        } else {
            results[i].trackUrl = 'Not Available';
        }

        callback();

    });

}

function getAudioFeatures(url, i, callback) {

    request({
        url: url,
        headers: {
            'Authorization': 'Bearer ' + spotifyAccessToken
        }
    }, function(err, res, body) {

        var body = JSON.parse(body);

        if(body.tempo) {
            var trackBpm = body.tempo;
        } else {
            var trackBpm = 'Not Available';
        }

        results[i].trackBpm = trackBpm;

        callback();

    });

}


module.exports = {
    getOmnifySearch: getOmnifySearch
};