(function() {
    
    //------------------------------------------------------------------------
    const package_name = "umbriel";



    //------------------------------------------------------------------------
    var $data;

    //------------------------------------------------------------------------
    const editMarker = (marker) => {
        LT.view.menu.lock();
        setTimeout(() => {
            $data.title = "Marker";
        }, 200);
    }

    const dropMarker = () => {
        $data.marker.drop(package_name)
            .then(() => {
                $data.title = "";
                LT.view.menu.unlock();                
            });
    }


    //------------------------------------------------------------------------
    const moveFromEdge = (latlng) => {
        return new Promise(function(resolve, reject) {
            // are we too close to the edge for our menu?
            let pos = LT.atlas.map.latLngToContainerPoint(latlng);
            let dimensions = document.getElementById("map").getBoundingClientRect()
            let margin = 110;
            let center_point = LT.atlas.map.getSize().divideBy(2);

            if (pos.x < margin || pos.x > dimensions.width-margin) {
                let direction = (pos.x < margin ? "subtract" : "add");
                let target_point = center_point[direction]([margin, 0]);
                let target_latlng = LT.atlas.map.containerPointToLatLng(target_point);
                LT.atlas.map.panTo(target_latlng);
                LT.atlas.map.once("moveend", () => {
                    resolve(latlng);
                });
            } 
            else if (pos.y < margin || pos.y > dimensions.height-margin) {
                let direction = (pos.y < margin ? "subtract" : "add");
                let target_point = center_point[direction]([0,margin]);
                let target_latlng = LT.atlas.map.containerPointToLatLng(target_point);
                LT.atlas.map.panTo(target_latlng);
                LT.atlas.map.once("moveend", () => {
                    resolve(latlng);
                });
            } 
            else {
                resolve(latlng);
            }
        });
    }    

    /**
    * Changes marker position and shares with network
    */
    const moveMarker = () => {
        
        LT.view.menu.lock();
        $data.title = "";
        $data.marker.layer.dragging.enable();
        let original_icon = $data.marker.getIcon();
        $data.marker.setIcon("arrows-alt");
        $data.marker.once("move", (val) => {
            console.log("[a:radiant]".padEnd(20, " ") + " moved marker with tags: ", $data.marker.tags.join(", "));
            $data.marker.setIcon(original_icon);
            $data.marker.layer.dragging.disable();
            $data.marker.save(package_name);

            setTimeout(() => {
                LT.view.menu.unlock();
            }, 500);
        });
    }



    //------------------------------------------------------------------------
    /**
    * Map Click
    */
    const onMapClick = function(e) {
        if (LT.view.menu.isLocked()) {
            return;
        }
        
        moveFromEdge(e.latlng)        
            .then(moveFromEdge)
            .then(() => {
                let pos = LT.atlas.map.latLngToContainerPoint(e.latlng);
                
                let items = [
                    {
                        "event": "zoom-in",
                        "icon": "search-plus",
                        "method": () => {
                            LT.atlas.zoomToPoint(e.latlng);
                        }
                    },
                    {
                        "event": "zoom-out",
                        "icon": "search-minus"
                    },
                    {
                        "event": "marker-add",
                        "icon": "plus-circle",
                        "method": () => {
                            LT.atlas.zoomToPoint(e.latlng);
                            return e.latlng;
                        }
                    }
                ];

                LT.view.menu.open(items, pos);
                LT.view.menu.lock();
                LT.view.menu.once("close", () => {
                    setTimeout(() => {
                        LT.view.menu.unlock();
                        LT.atlas.removePointer();
                    }, 50);
                });
            });
    }


    /**
    * Marker Click
    */
    const onMarkerClick = function(marker) {

        if (LT.view.menu.isLocked()) {
            return;
        }

        // skip marker marked already for movement
        if (marker.getIcon() == "arrows-alt") {
            return;
        }

        $data.marker = marker;
        $data.marker.inspect();
        $data.title = "";
        moveFromEdge($data.marker.latlng)
            .then(moveFromEdge)
            .then(() => {
                let pos = LT.atlas.map.latLngToContainerPoint($data.marker.latlng);
                let menu_items = [
                    {
                        "event": "zoom-in",
                        "icon": "search-plus",
                        "method": () => {
                            LT.atlas.zoomToPoint($data.marker.latlng);
                        }
                    },
                    {
                        "event": "zoom-out",
                        "icon": "search-minus"
                    },
                    {
                        "event": "marker-edit",
                        "icon": "edit",
                        "method": () => {
                            editMarker($data.marker.latlng);
                        }
                    }
                ];
                LT.view.menu.open(menu_items, pos);

                LT.view.menu.lock();
                $data.marker.once("hide", () => {
                    LT.view.menu.close();
                    LT.atlas.removePointer();
                    $data.title = "";
                });

                LT.view.menu.once("close", () => {
                    setTimeout(() => {
                        LT.atlas.removePointer();
                    }, 50);
                });

                $data.marker.once("move", () => {
                    LT.view.menu.close();
                    $data.title = "";
                });
            
            });
    }



    //------------------------------------------------------------------------
    var self = {
        methods: {
            close: function() {
                $data.title = null;
                LT.atlas.menu.unlock();
            },
            chooseItem: function(item) {
                if (item.hasOwnProperty("method")) {
                    item.method(item);
                }
            }
        },
        data: {
            title: "",
            marker: null,
            menu: [
                {"label":"Move", "method": moveMarker}, 
                {"label":"Delete", "method": dropMarker}
            ]
        },
        open: false,
        mounted() {
            var map_clicked = 0;
            $data = this.$data;

            // show pie menu for marker-specific contextual actions
            LT.atlas.on("marker-click", onMarkerClick);


            // show pie menu for general map interactions
            LT.atlas.on("map-click", onMapClick);


            LT.atlas.on("map-click-start", (e) => {
                if (!LT.view.menu.isLocked()) {
                    LT.atlas.addPointer(e.latlng);
                }
            })

            // close pie menu on resize
            window.addEventListener("resize", function() {
                LT.view.menu.close();
            });

            // zoom out action
            LT.view.menu.on("zoom-out", () => {
                LT.atlas.map.zoomOut(2);
                LT.atlas.map.once("moveend", () => {
                    LT.atlas.removePointer();
                });
            });

        }
    };



    return self;
}());