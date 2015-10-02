/* global loadImage */
/* global Instajam */
/// <reference path="../typings/jquery/jquery.d.ts"/>

var fullscreenEnabled = (document.fullscreenEnabled ||
                         document.webkitFullscreenEnabled ||
                         document.mozFullScreenEnabled ||
                         document.msFullscreenEnabled);

var fullscreenElement = (document.fullscreenElement ||
                         document.webkitFullscreenElement ||
                         document.mozFullScreenElement ||
                         document.msFullscreenElement);

var exitFullscreen = (document.exitFullscreen ||
                      document.webkitExitFullscreen ||
                      document.mozCancelFullScreen ||
                      document.msExitFullscreen);

var PageTransition = (function ($) {
    'use strict';

    /* effect */
    var outClass = 'pt-page-flipOutRight';
    var inClass = 'pt-page-flipInLeft pt-page-delay500';

    var PageTransition = function(container) {
        this.$container = $(container);
        this.$pages = [];
        this.reload();
    }

    PageTransition.prototype.reload = function (){
        var self = this;
        this.$pages = this.$container.children('.pt-page');
        this.current = -1;
        this.isAnimating = false;
        this.$pages.each(function(i) {
            var $page = $(this);
            if ($page.hasClass("pt-page-current")) {
                self.current = i;
            }
            $page.data('original-class-list',
                $page.attr('class').replace(/\bpt-page-current\b/,""));
        });

    }

    PageTransition.prototype.next = function() {
        var self = this;
        if (this.isAnimating) {
            return false;
        }
        if (this.$pages.length == 0) {
            return false;
        }
        var $currPage;
        var endNextPage = false;
        var endCurrPage = false;

        if (this.current >= 0) {
            $currPage = this.$pages.eq(this.current);
        } else {
            endCurrPage = true;
        }
        this.isAnimating = true;

        this.current = ++this.current>=this.$pages.length?0:this.current;

        var $nextPage = this.$pages.eq(this.current).addClass('pt-page-current');

        var reset = function() {
            self.isAnimating = false;
            if ($currPage) {
                $currPage.attr('class', $currPage.data('original-class-list'));
            }
            $nextPage.attr('class', $nextPage.data('original-class-list') + ' pt-page-current');
        }

        var events = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
        if ($currPage) {
            $currPage.addClass(outClass).one(events, function(event) {
                /* some browsers send two events like chrome (webkitAnimationEnd and animationend) */
                $(this).off(events);
                endCurrPage = true;
                if (endNextPage) {
                    reset();
                }
            });
        }
        $nextPage.addClass(inClass).one(events, function(event) {
            /* some browsers send two events like chrome (webkitAnimationEnd and animationend) */
            $(this).off(events);
            endNextPage = true;
            if (endCurrPage) {
                reset();
            }
        });
        return true;
    }
    return PageTransition;
})(jQuery);

/* request tags */
var getPhotosUrls = function(tag, count, onSuccess, onError) {
    instagram.tag.media(tag, {'count': count}, function(response) {
        if (! response.data) {
            if (onError && typeof(onError) === 'function') {
                //console.log("No data: ", response);
                onError(response.meta);
            }
            return;
        }
        var urls = [];

        $.each(response.data, function(index, post) {
            if (!(post.type == 'image')) {
                return;
            }
            if (post.images && post.images.standard_resolution) {
                var url = post.images.standard_resolution.url;
                if (url) {
                    urls.push(url);
                }
            }
        });
        if (onSuccess && typeof(onSuccess) === 'function') {
            onSuccess(urls);
        }
    });
};

/* TODO: refactoring this */
var loadNewPics = function (urls, onLoadOne, onLoadAll) {
    var missing = urls.length;
    var imgs = [];
    $.each(urls, function(index, url) {
        /*var page = $("<div>").addClass('pt-page');*/
        loadImage(url, function(img) {
            missing--;
            //console.log("Got image " + (data.length - missing) + "/" + data.length);
            if (onLoadOne && typeof(onLoadOne) === 'function') {
                onLoadOne(url, img, img.type, urls.length - missing, urls.length);
            }
            if (img.type != 'error') {
                imgs.push(img);
            }
            //$container.append($(img).addClass('pt-page'));
            if (missing == 0) {
                if (onLoadAll && typeof(onLoadAll) === 'function') {
                    onLoadAll(imgs)
                }
            }
        })
    });
};

var DEFAULT_HASHTAG = "Snow";
var DEFAULT_MAX_PHOTOS = 20;
var LIMIT_MAX_PHOTOS = 33;
var DEFAULT_CHANGE_MS = 3 * 1000;
/* default is each photo showing twice */
var DEFAULT_UPDATE_MS = DEFAULT_MAX_PHOTOS * DEFAULT_CHANGE_MS * 2;

/* make they global */
var instagram;
var appuri;
var pt;
var interval;

$(document).on('ready', function(){
    pt = new PageTransition("#pt-container")
    appuri = URI(document.URL);
    instagram = Instajam.init({
        clientId: 'e0c943c7ee9c444db995a8688979e078',
        redirectUri: appuri.toString(),
        scope: ['basic']
    });

    /* set mouse behavior */
    $('body').on('mousemove', function() {
        $("#toolbar").show();
        $('body').css('cursor', 'auto');
    }).on('mouseout', function() {
        $("#toolbar").hide();
    }).on('mousemove', $.debounceLast(2000, function() {
        $("#toolbar").hide();
        $('body').css('cursor', 'none');
    }));

    /* fullscreen */
    if (fullscreenEnabled) {
        $("#fullscreen").show().on("click", function() {
            if (fullscreenElement){
                /* is in fullscreen, exit */
                if(exitFullscreen) {
                    exitFullscreen();
                } else {
                    console.error("Unable to exit fullscreen");
                }
            } else {
                /* not in fullscreen, enter

                   requestFullscreen() is deprecated on insecure origins,
                   and support will be removed in the future. Consider using
                   HTTPS.
                 */
                var i = $("#app")[0];
                if (i.requestFullscreen) {
                    i.requestFullscreen();
                } else if (i.webkitRequestFullscreen) {
                    i.webkitRequestFullscreen();
                } else if (i.mozRequestFullScreen) {
                    i.mozRequestFullScreen();
                } else if (i.msRequestFullscreen) {
                    i.msRequestFullscreen();
                } else {
                    console.error("Unable to enter in fullscreen");
                }
            }
        });
    }

    /* modal settings */
    $("#settings-dialog").on("show.bs.modal", function() {
        $("#hashtag")
            .attr("value", localStorage.getItem("hashtag"))
            .attr("placeholder", DEFAULT_HASHTAG);
        $("#update-photos-ms")
            .attr("value", localStorage.getItem("update-photos-ms"))
            .attr("placeholder", DEFAULT_UPDATE_MS);
        $("#change-photos-ms")
            .attr("value", localStorage.getItem("change-photos-ms"))
            .attr("placeholder", DEFAULT_CHANGE_MS);
        $("#max-photos")
            .attr("value", localStorage.getItem("max-photos"))
            .attr("placeholder", DEFAULT_MAX_PHOTOS);

        $("#max-photos-limit").text(LIMIT_MAX_PHOTOS);

        if (!instagram.authenticated) {
            console.log("Not authorized");
            var qs = appuri.query(true);
            if (qs.error) {
                console.log("User doesn't authorized us");
            }
            $("#alert-not-auth").alert();
        } else {
            $("#alert-not-auth").hide();
        }
    });

    /* config authorizes button */
    $("#auth-button").on('click', function(){
         window.location=instagram.authUrl;
    });

    /* config reset button */
    $("#settings-dialog #reset").on('click', function() {
        localStorage.removeItem("hashtag");
        localStorage.removeItem("update-photos-ms");
        localStorage.removeItem("change-photos-ms");
        localStorage.removeItem("max-photos");
        location.reload();
    });

    /* config save button */
    $("#settings-dialog #save").on('click', function() {
        if ($("#hashtag").val()) {
            localStorage.setItem("hashtag", $("#hashtag").val());
        } else {
            localStorage.removeItem("hashtag");
        }

        if ($("#update-photos-ms").val()) {
            localStorage.setItem("update-photos-ms", $("#update-photos-ms").val());
        } else {
            localStorage.removeItem("update-photos-ms");
        }

        if ($("#change-photos-ms").val()) {
            localStorage.setItem("change-photos-ms", $("#change-photos-ms").val());
        } else {
            localStorage.removeItem("change-photos-ms");
        }

        if ($("#max-photos").val()) {
            var val = $("#max-photos").val();
            localStorage.setItem("max-photos", val>LIMIT_MAX_PHOTOS?LIMIT_MAX_PHOTOS:val);
        } else {
            localStorage.removeItem("max-photos");
        }
        location.reload();
    });

    var updatePhotos = function(tag, count, onDone, onError) {
        getPhotosUrls(tag, count, function(urls) {
            //console.log("success getPhotoUrls", data);
            var $progressBarContainer = $("#progress-bar-container");
            var $progressBar= $("#progress-bar");

            $progressBar.css('width', '0%');
            $progressBar.text("0/" + urls.length + " (0%)");

            $progressBarContainer.show();

            loadNewPics(urls, function(url, img, code, index, total) {
                /* loaded one, update progress bar */
                if (code === 'error') {
                    console.error("Error while requesting " + url);
                }
                var percent = '0%';

                if (total > 0) {
                    percent = Math.ceil((index/total) * 100) + "%";
                }
                $progressBar.css('width', percent);
                $progressBar.text(index + "/" + total + " (" + percent + ")");

            }, function(imgs) {
                /* all loaded, update container */
                var saved_classes = pt.$container.attr('class');
                var animated = 'animated rotateOut';
                pt.$container.addClass(animated);
                var events = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
                pt.$container.one(events, function() {
                    /* some browsers send two events like chrome (webkitAnimationEnd and animationend) */
                    $(this).off(events);
                    pt.$container.empty();

                    $.each(imgs, function(index, img) {
                        var $page = $("<div>").addClass('pt-page');
                        var $img = $(img).addClass("instagram");
                        $img.appendTo($page);
                        $page.appendTo(pt.$container);
                    });

                    pt.$container.attr('class', saved_classes);
                    /* make sure animated classes were removed */
                    pt.$container.removeClass(animated);
                    $progressBarContainer.hide();
                    pt.reload();

                    if (onDone && typeof(onDone) === "function") {
                        onDone();
                    }
                });

            });

        }, function (response) {
            //console.log("error getPhotoUrls", data);
            if (response.code === 400) {
                /* Unauthorized */
                //instagram.deauthenticate();
                //location.reload();
            }
            if (onError && typeof(onError) === "function") {
                onError(response.code);
            }
        });
    }

    var tag = localStorage.getItem("hashtag") || DEFAULT_HASHTAG;
    var change_photos_ms = Number(localStorage.getItem("change-photos-ms")) || DEFAULT_CHANGE_MS;
    var update_photos_ms = Number(localStorage.getItem("update-photos-ms")) || DEFAULT_UPDATE_MS;
    var max_photos = Number(localStorage.getItem("max-photos")) || DEFAULT_MAX_PHOTOS;

    /* verify the limit */
    max_photos = max_photos>LIMIT_MAX_PHOTOS?LIMIT_MAX_PHOTOS:max_photos;

    var changePhotosLoop = $.throttle(change_photos_ms, function() {
        pt.next();
        //console.log("next");
    });

    var updatePhotosLoop = $.throttle(update_photos_ms, function() {
        updatePhotos(tag, max_photos, function() {
            //debugger;
            //console.log("Photos updated");
        }, function(code) {
            console.warn("Error while updating photos: " + code);
            if (code === 400) {
                /* Unauthorized */
                instagram.deauthenticate();
                //location.reload();
            }
        });
    });
    interval = window.setInterval(function() {
        updatePhotosLoop();
        changePhotosLoop();
    }, 1000);
});



/*
Animations reference

switch( animation ) {

    case 1:
        outClass = 'pt-page-moveToLeft';
        inClass = 'pt-page-moveFromRight';
        break;
    case 2:
        outClass = 'pt-page-moveToRight';
        inClass = 'pt-page-moveFromLeft';
        break;
    case 3:
        outClass = 'pt-page-moveToTop';
        inClass = 'pt-page-moveFromBottom';
        break;
    case 4:
        outClass = 'pt-page-moveToBottom';
        inClass = 'pt-page-moveFromTop';
        break;
    case 5:
        outClass = 'pt-page-fade';
        inClass = 'pt-page-moveFromRight pt-page-ontop';
        break;
    case 6:
        outClass = 'pt-page-fade';
        inClass = 'pt-page-moveFromLeft pt-page-ontop';
        break;
    case 7:
        outClass = 'pt-page-fade';
        inClass = 'pt-page-moveFromBottom pt-page-ontop';
        break;
    case 8:
        outClass = 'pt-page-fade';
        inClass = 'pt-page-moveFromTop pt-page-ontop';
        break;
    case 9:
        outClass = 'pt-page-moveToLeftFade';
        inClass = 'pt-page-moveFromRightFade';
        break;
    case 10:
        outClass = 'pt-page-moveToRightFade';
        inClass = 'pt-page-moveFromLeftFade';
        break;
    case 11:
        outClass = 'pt-page-moveToTopFade';
        inClass = 'pt-page-moveFromBottomFade';
        break;
    case 12:
        outClass = 'pt-page-moveToBottomFade';
        inClass = 'pt-page-moveFromTopFade';
        break;
    case 13:
        outClass = 'pt-page-moveToLeftEasing pt-page-ontop';
        inClass = 'pt-page-moveFromRight';
        break;
    case 14:
        outClass = 'pt-page-moveToRightEasing pt-page-ontop';
        inClass = 'pt-page-moveFromLeft';
        break;
    case 15:
        outClass = 'pt-page-moveToTopEasing pt-page-ontop';
        inClass = 'pt-page-moveFromBottom';
        break;
    case 16:
        outClass = 'pt-page-moveToBottomEasing pt-page-ontop';
        inClass = 'pt-page-moveFromTop';
        break;
    case 17:
        outClass = 'pt-page-scaleDown';
        inClass = 'pt-page-moveFromRight pt-page-ontop';
        break;
    case 18:
        outClass = 'pt-page-scaleDown';
        inClass = 'pt-page-moveFromLeft pt-page-ontop';
        break;
    case 19:
        outClass = 'pt-page-scaleDown';
        inClass = 'pt-page-moveFromBottom pt-page-ontop';
        break;
    case 20:
        outClass = 'pt-page-scaleDown';
        inClass = 'pt-page-moveFromTop pt-page-ontop';
        break;
    case 21:
        outClass = 'pt-page-scaleDown';
        inClass = 'pt-page-scaleUpDown pt-page-delay300';
        break;
    case 22:
        outClass = 'pt-page-scaleDownUp';
        inClass = 'pt-page-scaleUp pt-page-delay300';
        break;
    case 23:
        outClass = 'pt-page-moveToLeft pt-page-ontop';
        inClass = 'pt-page-scaleUp';
        break;
    case 24:
        outClass = 'pt-page-moveToRight pt-page-ontop';
        inClass = 'pt-page-scaleUp';
        break;
    case 25:
        outClass = 'pt-page-moveToTop pt-page-ontop';
        inClass = 'pt-page-scaleUp';
        break;
    case 26:
        outClass = 'pt-page-moveToBottom pt-page-ontop';
        inClass = 'pt-page-scaleUp';
        break;
    case 27:
        outClass = 'pt-page-scaleDownCenter';
        inClass = 'pt-page-scaleUpCenter pt-page-delay400';
        break;
    case 28:
        outClass = 'pt-page-rotateRightSideFirst';
        inClass = 'pt-page-moveFromRight pt-page-delay200 pt-page-ontop';
        break;
    case 29:
        outClass = 'pt-page-rotateLeftSideFirst';
        inClass = 'pt-page-moveFromLeft pt-page-delay200 pt-page-ontop';
        break;
    case 30:
        outClass = 'pt-page-rotateTopSideFirst';
        inClass = 'pt-page-moveFromTop pt-page-delay200 pt-page-ontop';
        break;
    case 31:
        outClass = 'pt-page-rotateBottomSideFirst';
        inClass = 'pt-page-moveFromBottom pt-page-delay200 pt-page-ontop';
        break;
    case 32:
        outClass = 'pt-page-flipOutRight';
        inClass = 'pt-page-flipInLeft pt-page-delay500';
        break;
    case 33:
        outClass = 'pt-page-flipOutLeft';
        inClass = 'pt-page-flipInRight pt-page-delay500';
        break;
    case 34:
        outClass = 'pt-page-flipOutTop';
        inClass = 'pt-page-flipInBottom pt-page-delay500';
        break;
    case 35:
        outClass = 'pt-page-flipOutBottom';
        inClass = 'pt-page-flipInTop pt-page-delay500';
        break;
    case 36:
        outClass = 'pt-page-rotateFall pt-page-ontop';
        inClass = 'pt-page-scaleUp';
        break;
    case 37:
        outClass = 'pt-page-rotateOutNewspaper';
        inClass = 'pt-page-rotateInNewspaper pt-page-delay500';
        break;
    case 38:
        outClass = 'pt-page-rotatePushLeft';
        inClass = 'pt-page-moveFromRight';
        break;
    case 39:
        outClass = 'pt-page-rotatePushRight';
        inClass = 'pt-page-moveFromLeft';
        break;
    case 40:
        outClass = 'pt-page-rotatePushTop';
        inClass = 'pt-page-moveFromBottom';
        break;
    case 41:
        outClass = 'pt-page-rotatePushBottom';
        inClass = 'pt-page-moveFromTop';
        break;
    case 42:
        outClass = 'pt-page-rotatePushLeft';
        inClass = 'pt-page-rotatePullRight pt-page-delay180';
        break;
    case 43:
        outClass = 'pt-page-rotatePushRight';
        inClass = 'pt-page-rotatePullLeft pt-page-delay180';
        break;
    case 44:
        outClass = 'pt-page-rotatePushTop';
        inClass = 'pt-page-rotatePullBottom pt-page-delay180';
        break;
    case 45:
        outClass = 'pt-page-rotatePushBottom';
        inClass = 'pt-page-rotatePullTop pt-page-delay180';
        break;
    case 46:
        outClass = 'pt-page-rotateFoldLeft';
        inClass = 'pt-page-moveFromRightFade';
        break;
    case 47:
        outClass = 'pt-page-rotateFoldRight';
        inClass = 'pt-page-moveFromLeftFade';
        break;
    case 48:
        outClass = 'pt-page-rotateFoldTop';
        inClass = 'pt-page-moveFromBottomFade';
        break;
    case 49:
        outClass = 'pt-page-rotateFoldBottom';
        inClass = 'pt-page-moveFromTopFade';
        break;
    case 50:
        outClass = 'pt-page-moveToRightFade';
        inClass = 'pt-page-rotateUnfoldLeft';
        break;
    case 51:
        outClass = 'pt-page-moveToLeftFade';
        inClass = 'pt-page-rotateUnfoldRight';
        break;
    case 52:
        outClass = 'pt-page-moveToBottomFade';
        inClass = 'pt-page-rotateUnfoldTop';
        break;
    case 53:
        outClass = 'pt-page-moveToTopFade';
        inClass = 'pt-page-rotateUnfoldBottom';
        break;
    case 54:
        outClass = 'pt-page-rotateRoomLeftOut pt-page-ontop';
        inClass = 'pt-page-rotateRoomLeftIn';
        break;
    case 55:
        outClass = 'pt-page-rotateRoomRightOut pt-page-ontop';
        inClass = 'pt-page-rotateRoomRightIn';
        break;
    case 56:
        outClass = 'pt-page-rotateRoomTopOut pt-page-ontop';
        inClass = 'pt-page-rotateRoomTopIn';
        break;
    case 57:
        outClass = 'pt-page-rotateRoomBottomOut pt-page-ontop';
        inClass = 'pt-page-rotateRoomBottomIn';
        break;
    case 58:
        outClass = 'pt-page-rotateCubeLeftOut pt-page-ontop';
        inClass = 'pt-page-rotateCubeLeftIn';
        break;
    case 59:
        outClass = 'pt-page-rotateCubeRightOut pt-page-ontop';
        inClass = 'pt-page-rotateCubeRightIn';
        break;
    case 60:
        outClass = 'pt-page-rotateCubeTopOut pt-page-ontop';
        inClass = 'pt-page-rotateCubeTopIn';
        break;
    case 61:
        outClass = 'pt-page-rotateCubeBottomOut pt-page-ontop';
        inClass = 'pt-page-rotateCubeBottomIn';
        break;
    case 62:
        outClass = 'pt-page-rotateCarouselLeftOut pt-page-ontop';
        inClass = 'pt-page-rotateCarouselLeftIn';
        break;
    case 63:
        outClass = 'pt-page-rotateCarouselRightOut pt-page-ontop';
        inClass = 'pt-page-rotateCarouselRightIn';
        break;
    case 64:
        outClass = 'pt-page-rotateCarouselTopOut pt-page-ontop';
        inClass = 'pt-page-rotateCarouselTopIn';
        break;
    case 65:
        outClass = 'pt-page-rotateCarouselBottomOut pt-page-ontop';
        inClass = 'pt-page-rotateCarouselBottomIn';
        break;
    case 66:
        outClass = 'pt-page-rotateSidesOut';
        inClass = 'pt-page-rotateSidesIn pt-page-delay200';
        break;
    case 67:
        outClass = 'pt-page-rotateSlideOut';
        inClass = 'pt-page-rotateSlideIn';
        break;

}
*/
