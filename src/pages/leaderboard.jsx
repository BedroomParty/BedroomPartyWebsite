import React, { useEffect, useState } from 'react';
import { icon } from '@fortawesome/fontawesome-svg-core/import.macro'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import SEO from '../components/SEO';

import { useSearchParams, useParams, useRouter } from 'next/navigation'

import JSONbig from 'json-bigint';

import Heading from '../components/heading'
import Spinner from '../components/spinner';
import Leaderboard from '../components/leaderboard'

import Wallpaper from '../scripts/wallpaper';

import enums from '../../util/enum';
import time from '../../util/time';

import { notFound } from 'next/navigation';

export default function LeaderboardList({ bpApiLocation, query, mapDetails }) {
    if(!mapDetails || !mapDetails.versions) return notFound();

    const mapHash = `${query.id}`.toUpperCase();

    const perPage = 10;

    const [opts, setOpts] = useState({
        unset: true,
        ran: false,
        sort: `top`,
        id: `76561198345634943`, // not sure what to do with this
        char: query.char,
        diff: query.diff,
    });

    const totalLoadingSteps = 2;

    const thisVersion = mapDetails?.versions.find(o => o.hash.toLowerCase() == mapHash.toLowerCase()) || {};

    console.log(`thisVersion`, thisVersion);

    const [state, setState] = useState(thisVersion ? {
        title: mapDetails.name,
        description: `Uploaded ${time(Date.now() - new Date(thisVersion.createdAt || mapDetails.uploaded).getTime()).string} ago`,
        mapData: mapDetails,
        mapVersion: thisVersion,
        image: thisVersion.coverURL || `https://cdn.beatsaver.com/${mapHash.toLowerCase()}.jpg`,
        artist: mapDetails.metadata.songAuthorName,
        mapper: mapDetails.metadata.levelAuthorName,
        mapOverview: {},
        difficultyMap: {},
        buttons: [
            {
                icon: icon({name: 'hand-pointer'}),
                title: `OneClick`,
                key: `oneclick`,
                href: `beatsaver://${mapDetails.id}`,
            },
            {
                icon: icon({name: 'link'}),
                title: `BeatSaver page`,
                key: `beatsaver`,
                href: `https://beatsaver.com/maps/${mapDetails.id}`,
            },
        ],
        tags: [
            {
                icon: icon({name: 'angle-up'}),
                value: mapDetails.stats.upvotes,
                title: `${mapDetails.stats.upvotes} Upvotes`,
                key: `upvotes`,
                color: `#5ac452`
            },
            {
                icon: icon({name: 'angle-down'}),
                value: mapDetails.stats.downvotes,
                title: `${mapDetails.stats.downvotes} Downvotes`,
                key: `downvotes`,
                color: `#c45262`
            }
        ],
        diffTags: thisVersion.diffs.map(({ characteristic, difficulty }) => ({
            icon: icon({name: 'trophy'}),
            value: `${characteristic} / ${difficulty}`,
            title: `${characteristic} / ${difficulty}`,
            key: `${characteristic}-${difficulty}`,
            color: `rgba(0, 0, 0, 0.2)`,
        })),
        loading: `Fetching leaderboard details...`,
    } : {
        title: `Map not found`,
        description: `${`The map you are looking for could not be found.`}`,
    });

    const [scores, setScores] = useState({
        page: 1,
        totalPages: 0,
        total: (<Spinner />),
        offset: 0,
        mapHash: null,
        char: null,
        diff: null,
        entries: [],
        loading: true,
        error: null,
    });

    let wallpaper;

    const getOverview = ({mapHash, newState=state}) => new Promise(async (res, rej) => {
        console.log(`getting overview for ${mapHash}`, newState.mapOverview)

        if(newState.mapOverview?._mapHash == mapHash/* && newState.mapOverview?._fetched + 60000 > Date.now()*/) {
            return res({
                overview: newState.mapOverview,
                newState: newState
            });
        } else {
            newState = {
                ...newState,
                loading: `[2/${totalLoadingSteps}] Fetching leaderboard details...`
            };

            setState(newState);
        }

        fetch(bpApiLocation + `/leaderboard/${mapHash}/overview`)
            .then(res => res.text())
            .then(res => Promise.resolve(JSONbig.parse(res)))
            .then(data => {
                Object.assign(data, {
                    _mapHash: mapHash,
                    _fetched: Date.now(),
                });

                console.log(`overview`, data);

                const newNewState = {
                    ...newState,
                    mapOverview: data
                }

                setState(newNewState)
                
                res({
                    overview: data,
                    newState: newNewState
                });
            })
            .catch(rej)
    });

    const getScores = (mapHash, newState=state, newOpts=opts, page = 1) => {
        setScores({
            ...scores,
            page: 1,
            totalPages: 0,
            total: (<Spinner />),
            offset: 0,
            mapHash: mapHash,
            char: null,
            diff: null,
            entries: [],
            loading: true,
            error: null,
        });

        getOverview({mapHash, newState: newState || state}).then(({overview, newState}) => {
            newState = {
                ...newState,
                loading: false,
            };

            const matchedDiffs = thisVersion.diffs.filter(({ characteristic, difficulty }) => overview[characteristic]?.includes(enums.diff[difficulty].toString()));

            const highest = matchedDiffs.slice(-1)[0] || thisVersion.diffs.slice(-1)[0];
    
            newOpts = {
                ...newOpts,
                ran: true,
            };

            if(!thisVersion.diffs.find(o => o.characteristic == newOpts.char && o.difficulty == enums.diff[newOpts.diff]) && highest) {
                console.log(`could not find selected char ${newOpts.char} and diff ${enums.diff[newOpts.diff]} / ${newOpts.diff}; falling back to highest available on LB`, highest);

                Object.assign(newOpts, {
                    char: highest.characteristic,
                    diff: Object.entries(enums.diff).find(o => o[1] == highest.difficulty)[0],
                });
            }
    
            setOpts(newOpts);
            
            const link = bpApiLocation + `/leaderboard/${mapHash}?limit=${perPage}&sort=${newOpts.sort}&page=${page-1}&char=${newOpts.char}&diff=${newOpts.diff}&id=${newOpts.id}`;
            console.log(`fetching ${link}`);

            fetch(link)
                .then(async response => {
                    let data = await new Promise(r => response.text().then(r).catch(r)).then(JSONbig.parse);

                    console.log(`response`, response);

                    const thisVersion = newState.mapVersion;

                    console.log(`LB`, data);
                    console.log(`thisVersion`, thisVersion);

                    const newScores = {
                        ...scores,
                        page: page || 1,
                        totalPages: Math.max(1, data.scoreCount && Math.ceil(data.scoreCount / perPage) || 1),
                        total: Number(data.scoreCount) || 0,
                        offset: (page - 1) * perPage,
                        mapHash: mapHash,
                        char: newOpts.char,
                        diff: newOpts.diff,
                        entries: data.scores || [],
                        loading: false,
                        error: null
                    };

                    newScores.entries.push(...(Array.from(Array(perPage - (newScores.entries || []).length).keys())));

                    newScores.entries = newScores.entries.map((o, i) => {
                        if(typeof o != `object`) {
                            o = {
                                empty: true,
                            };

                            return o;
                        }

                        Object.assign(o, { 
                            key: `${newScores.char}-${newScores.diff}-${o.position}`,
                            id: `${typeof o.id == `object` ? `(i64 lol)` : o.id}`
                        });

                        return Object.assign(o, {
                            link: o.id && o.id != `undefined` && `/user/${o.id}` || null,
                        })
                    });

                    console.log(`new scores:`, newScores.entries)
    
                    setScores(newScores);

                    let newNewState = {
                        ...newState,
                        diffTags: thisVersion.diffs.map(({ characteristic, difficulty }) => ({
                            icon: icon({name: 'trophy'}),
                            value: `${characteristic} / ${difficulty}`,
                            title: `${characteristic} / ${difficulty}`,
                            key: `${characteristic}-${difficulty}`,
                            ...(characteristic == newOpts.char && difficulty == enums.diff[newOpts.diff] ? {
                                color: `#52c49e`
                            } : {
                                color: `rgba(0, 0, 0, 0.2)`,
                                onClick: () => {
                                    const newNewOpts = {
                                        ...newOpts,
                                        char: characteristic,
                                        diff: enums.diff[difficulty],
                                    };

                                    console.log(`selected opts`, newNewOpts)

                                    setOpts(newNewOpts);

                                    getScores(mapHash, newNewState, newNewOpts, 1);
                                }
                            }),
                        }))
                    };

                    setState(newNewState);
                })
                .catch(e => {
                    console.error(e);
                    setScores({
                        ...scores,
                        total: (<FontAwesomeIcon icon={icon({name: 'circle-exclamation'})} style={{width: `20px`, height: `20px`}} />),
                        error: {
                            title: `Leaderboard data could not be parsed`,
                            description: `${e.name} / ${e.message}`
                        }
                    })
                })
        }).catch(e => {
            console.error(`overview failed`, e);
            setScores({
                ...scores,
                total: (<FontAwesomeIcon icon={icon({name: 'circle-exclamation'})} style={{width: `20px`, height: `20px`}} />),
                error: {
                    title: `Leaderboard overview could not be parsed`,
                    description: `${e.name} / ${e.message}`
                }
            })
        })
    };

    useEffect(() => {
        if(!query.id) return console.log(`no map`);
        if(opts.ran) return console.log(`opts already ran`);

        console.log(`running opts and setting ran to true`);

        setOpts({ ...opts, ran: true });
        
        console.log(`newOpts`, opts);

        wallpaper = new Wallpaper();

        console.log(`wallpaper`, wallpaper);

        if(mapHash && !state.error) {
            console.log(`MAP (${mapHash})`, mapDetails);

            wallpaper.set({
                url: thisVersion.coverURL || `https://cdn.beatsaver.com/${mapHash.toLowerCase()}.jpg`
            });

            getScores(mapHash, undefined, undefined, 1);
        }
    }, []);

    return (
        <div>
            <SEO
                title={`${(state.title && `[MAP] ${state.title}`) || `Unknown Map`} - Bedroom Party Leaderboard`}
                url={`https://thebedroom.party/leaderboard/${mapHash}`}
                image={(mapHash && `/leaderboard/${mapHash}/embed`) || state.image}
            />

            <Heading loading={state.loading} mapper={state.mapper} image={state.image} artist={state.artist} title={state.title} description={state.description} buttons={state.buttons} tags={state.tags} diffTags={state.diffTags} />
            <Leaderboard
                loading={scores.loading} 
                error={scores.error} 
                mapHash={scores.mapHash} 
                total={scores.total} 
                entries={scores.entries} 
                offset={scores.offset} 
                page={{
                    current: scores.page,
                    total: scores.totalPages,
                    set: (hash, num) => getScores(hash, undefined, undefined, num)
                }}
            />
        </div>
    )
}

export async function getServerSideProps(req) {
    const props = Object.assign({}, req.query, { query: req.query });

    try {
        const mapDetails = await fetch(`https://api.beatsaver.com/maps/hash/${`${props.query.id}`.toLowerCase()}`).then(res => res.json());

        return {
            props: {
                ...props,
                mapDetails,
            }
        }
    } catch(e) {
        return {
            props: {
                ...props,
                mapDetails: null,
            }
        }
    }
}