'use strict';

function getTracks(req, res) {
    var searchTerm = req.swagger.params.searchTerm.value;

    var tracks = {
        tracks: [
            {
                trackName: searchTerm
            }
        ]
    };

    res.json(tracks);
}

module.exports = {
    getTracks: getTracks
};