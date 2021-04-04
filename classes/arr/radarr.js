const mediaCard = require("./../cards/MediaCard");
const cType = require("./../cards/CardType");
const util = require("./../core/utility");
const core = require("./../core/cache");
const axios = require("axios");

/**
 * @desc Used to communicate with Radarr to obtain a list of future releases
 * @param radarrUrl
 * @param radarrToken
 */
class Radarr {
  constructor(radarrUrl, radarrToken) {
    this.radarrUrl = radarrUrl;
    this.radarrToken = radarrToken;
  }

  /**
   * @desc Gets the movie titles that fall within the range specified
   * @param {string} startDate - in yyyy-mm-dd format - Generally todays date
   * @param {string} endDate - in yyyy-mm-dd format - future date
   * @returns {Promise<object>} json results - results of search
   */
  async GetComingSoonRawData(startDate, endDate) {
    let response;

    try {
      response = await axios
        .get(
          this.radarrUrl +
            "/api/calendar?apikey=" +
            this.radarrToken +
            "&start=" +
            startDate +
            "&end=" +
            endDate
        )
        .catch((err) => {
          throw err;
        });
    } catch (err) {
      let d = new Date();
      console.log(d.toLocaleString() + " Radarr error: ", err.message);
    }

    return response;
  }

  // ******* TODO - not yet done below this point!!!!!


  /**
   * @desc Get Movie coming soon data and formats into mediaCard array
   * @param {string} startDate - in yyyy-mm-dd format - Generally todays date
   * @param {string} endDate - in yyyy-mm-dd format - future date
   * @returns {Promise<object>} mediaCards array - results of search
   */
  async GetComingSoon(startDate, endDate) {
    let csCards = [];
    // get raw data first
    let raw = await this.GetComingSoonRawData(startDate, endDate);
    // reutrn an empty array if no results
    if (raw != null) {
      // move through results and populate media cards
      await raw.data.reduce(async (memo, md) => {
        await memo;
        const medCard = new mediaCard();

        medCard.tagLine =
          "Season " +
          md.seasonNumber +
          ", Episode " +
          md.episodeNumber +
          " - '" +
          md.title +
          "' (" +
          md.airDate +
          ")";
        medCard.title = md.title;
        medCard.DBID = md.series.tvdbId;
        medCard.year = md.series.year;
        medCard.runTime = md.series.runtime;
        medCard.genre = md.series.genres;
        medCard.summary = await util.emptyIfNull(md.overview);
        medCard.mediaType = "episode";
        medCard.cardType = cType.CardTypeEnum.ComingSoon;

        // dont bother to download if only looking for premiers
        if (premieres == "true" && md.episodeNumber != 1) {
          // dont get cached files
        } else {
          // cache mp3 file
          let mp3 = md.series.tvdbId + ".mp3";
          await core.CacheMP3(mp3);
          medCard.theme = "/mp3cache/" + mp3;

          // cache image
          let fileName = md.series.tvdbId + ".jpg";
          let url = md.series.images[1].url;
          await core.CacheImage(url, fileName);
          medCard.posterURL = "/imagecache/" + fileName;
        }

        // content rating and colour
        let contentRating = "NR";
        if (!(await util.isEmpty(md.series.certification))) {
          contentRating = md.series.certification;
        }
        medCard.contentRating = contentRating;

        // set colours for rating badges
        let ratingColour = "";
        switch (contentRating.toLowerCase()) {
          case "nr":
            ratingColour = "badge-dark";
            break;
          case "unrated":
            ratingColour = "badge-dark";
            contentRating = "NR";
            break;
          case "g":
            ratingColour = "badge-success";
            break;
          case "g":
            ratingColour = "badge-success";
            break;
          case "tv-g":
            ratingColour = "badge-success";
            break;
          case "tv-y":
            ratingColour = "badge-success";
            break;
          case "pg":
            ratingColour = "badge-info";
            break;
          case "tv-pg":
            ratingColour = "badge-info";
            break;
          case "tv-y7":
            ratingColour = "badge-info";
            break;
          case "pg-13":
            ratingColour = "badge-warning";
            break;
          case "tv-14":
            ratingColour = "badge-warning";
            break;
          case "tv-ma":
            ratingColour = "badge-danger";
            break;
          case "r":
            ratingColour = "badge-danger";
            break;
          default:
            ratingColour = "badge-dark";
            break;
        }
        medCard.ratingColour = ratingColour;

        // add media card to array (taking into account premieres option)
        if (premieres && md.episodeNumber == 1) {
          csCards.push(medCard);
        } else {
          if (!premieres) {
            csCards.push(medCard);
          }
        }
      }, undefined);
    }
    let now = new Date();
    if (csCards.length == 0) {
      console.log(now.toLocaleString() + " No Coming soon titles found");
    } else {
      console.log(
        now.toLocaleString() + " Coming soon 'Movie' titles refreshed"
      );
    }
    return csCards;
  }
}

module.exports = Radarr;