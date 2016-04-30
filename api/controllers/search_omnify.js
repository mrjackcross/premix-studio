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

        console.log(res);

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
                    trackName: track.name,
                    trackArtist: track.artists[0].name,
                    trackImageUrl: track.album.images[2].url,
                    trackLength: track.duration_ms,
                };

                results.push(result);

                var matchTerm = (track.name + ' ' + track.artists[0].name).replace('&', '');
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
                });

            });

        });

    });
}

function getOmnifoneContentUrl(url, i, callback) {

    request(url, function(err, res, body) {

        var body = JSON.parse(body);
        var omniTrackId = body.trackIds[0].trackId;

        results[i].trackUrl = Config.omniEndPoint + omniAudioUri + audioEncoding + '/urls/' + omniTrackId + '.json' + audioParams;

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

        console.log(body);


        var trackBpm = body.tempo;
        results[i].trackBpm = trackBpm;

        //console.log(results[i]);

        callback();

    });

}


module.exports = {
    getOmnifySearch: getOmnifySearch
};