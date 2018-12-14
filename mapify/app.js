(function() {



    //------------------------------------------------------------------------
    const package_name = "umbriel";

    const icon_map = {
        "bed": "bed",
        "wtr": "tint",
        "net": "globe",
        "clo": "tshirt",
        "eat": "utensils",
        "pwr": "plug",
        "med": "prescription-bottle-alt",
        "ful": "gas-pump",
        "ven": "building",
        "sit": "exclamation",
        "obs": "hand-paper"
    }



    //------------------------------------------------------------------------
    /**
    * Display zoom and locate controls over the map interface
    */
    const setupControls = () => {
        // add zoom in & out control
        let zoom = L.control.zoom();
        zoom.setPosition("bottomright");
        zoom.addTo(LT.atlas.map);
        
        // create custom zoom icons
        let zoom_in = document.getElementsByClassName("leaflet-control-zoom-in")[0];
        let elem = document.createElement('span');
        elem.className = "fa fa-plus";
        zoom_in.innerHTML = "";
        zoom_in.appendChild(elem);
        let zoom_out = document.getElementsByClassName("leaflet-control-zoom-out")[0];
        let elem2 = document.createElement('span');
        elem2.className = "fa fa-minus";
        zoom_out.innerHTML = "";
        zoom_out.appendChild(elem2);

        // // add locate control
        L.control.locate(LC.leaflet_locatecontrol).addTo(LT.atlas.map);
    }




    //------------------------------------------------------------------------
    var self = {
        methods: {
            fitMap: () => {
                LT.atlas.fitMapToAllMarkers();
            }
        },
        computed: {
        },
        data: {
            "marker_count": 0
        },
        open: true,
        mounted() {
            // add map controls
            setupControls();

             // sync with all available markers from user-specific feed
            // this is pre-filtered based on installed packages
            LT.user.feed.on("update", (e) => {
                if (e.data === null) {
                    // item was deleted
                    if (LT.atlas.markers[e.id]) {
                        LT.atlas.markers[e.id].hide();
                    }
                }
                else if (e.data.g && e.data.t) {
                    // duck typing for markers
                    // only add a new marker if we don't have it in atlas
                    if (LT.atlas.markers[e.id]) {
                        let old_marker = LT.atlas.markers[e.id];
                        old_marker.update(e.data)
                    }
                    else {
                        let marker = new LX.MarkerItem(e.id, e.data);
                        marker.show();
                        marker.setIcons(icon_map);                        
                    }
                }
            });

            // make sure we have an organization to work with
            let org = new LX.Organization("lnt-dev", LT.db);
            org.getOrRegister("Project Lantern Development Team").then((res) => {

                // make sure we have the demo package installed
                org.publish(package_name, true)
                    .then(() => {
                        LT.user.install(package_name);
                    })
                    .catch((err) => {
                        console.error(err);
                    })
            });


            // keep the UI up-to-date based on changes to marker count
            LT.atlas.on("marker-add", () => {
                this.marker_count = LT.atlas.getMarkerCount();
            });

            LT.atlas.on("marker-remove", () => {
                this.marker_count = LT.atlas.getMarkerCount();
            })



        }
    };

    return self;
}());