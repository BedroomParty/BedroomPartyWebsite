import React, { Component, useState, useEffect } from 'react';
import { icon } from '@fortawesome/fontawesome-svg-core/import.macro'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { useSearchParams } from 'next/navigation'

import Heading from '../components/heading'
import Leaderboard from '../components/leaderboard'

import Wallpaper from '../scripts/wallpaper';

import enums from '../../util/enum';

export default function LeaderboardList() {
    const params = useSearchParams();

    const perPage = 10;

    const [opts, setOpts] = useState({
        unset: true,
        sort: `top`,
        id: `76561198345634943` // not sure what to do with this
    });

    const [state, setState] = useState({
        title: `Loading...`,
        description: `Loading map info...`,
        tags: [],
        diffTags: [],
    });

    const [scores, setScores] = useState({
        page: 1,
        totalPages: 0,
        total: (<FontAwesomeIcon icon={icon({name: 'circle-notch'})} spin style={{width: `20px`, height: `20px`}} />),
        offset: 0,
        difficultyMap: {},
        mapHash: null,
        entries: [],
        error: null,
    });

    let overview = {};

    let mapDetails = {};
    let thisVersion = {};

    let wallpaper;

    const getOverview = (mapHash) => new Promise(async (res, rej) => {
        if(overview._mapHash == mapHash && overview._fetched + 60000 > Date.now()) return res(overview);

        fetch(`https://api.thebedroom.party/leaderboard/${mapHash}/overview`)
            .then(res => res.json())
            .then(data => {
                Object.assign(data, {
                    _mapHash: mapHash,
                    _fetched: Date.now(),
                });

                console.log(`overview`, data);
                overview = data;
                
                res(data);
            })
            .catch(rej)
    })

    const getScores = (mapHash, newOpts=opts, newState=state, page = 1) => {
        setScores({
            ...scores,
            page: 1,
            totalPages: 0,
            total: (<FontAwesomeIcon icon={icon({name: 'circle-notch'})} spin style={{width: `20px`, height: `20px`}} />),
            offset: 0,
            difficultyMap: {},
            mapHash: mapHash,
            entries: [],
            error: null,
        });

        getOverview(mapHash).then(overview => {
            console.log(`opts`, opts);
            const link = `https://api.thebedroom.party/leaderboard/${mapHash}?limit=${perPage}&sort=${newOpts.sort}&page=${page-1}&char=${newOpts.char}&diff=${newOpts.diff}&id=${newOpts.id}`;
            console.log(`fetching ${link}`);
            fetch(link)
                .then(res => res.json())
                .then(data => {
                    console.log(`LB`, data);
    
                    setScores({
                        ...scores,
                        page: page,
                        totalPages: data.scoreCount ? Math.ceil(data.scoreCount / perPage) : 1,
                        total: data.scoreCount,
                        offset: (page - 1) * perPage,
                        difficultyMap: thisVersion.diffs.find(({ characteristic, difficulty }) => characteristic == newOpts.char && difficulty == enums.diff[newOpts.diff]) || {},
                        mapHash: mapHash,
                        entries: data.scores,
                        error: null
                    });

                    let newNewState = {
                        ...newState,
                        diffTags: thisVersion.diffs.filter(({ characteristic, difficulty }) => overview.scores[characteristic] && overview.scores[characteristic][enums.diff[difficulty]]).map(({ characteristic, difficulty }) => ({
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
                                    }

                                    setOpts(newNewOpts);
                                    getScores(mapHash, newNewOpts, newNewState, 1);
                                }
                            }),
                        }))
                    }

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
    }

    let ran = false;
    
    useEffect(() => {
        if(ran) return;

        ran = params.has(`map`);

        if(!ran) return;

        wallpaper = new Wallpaper(document.querySelector(`.bg`), document.querySelector(`.fg`));

        console.log(`wallpaper`, wallpaper);

        let mapHash = `${params.get(`map`)}`.toUpperCase();
    
        if(opts.unset) {
            console.log(`setting opts`);
            setOpts({
                unset: false, 
                char: params.get(`char`),
                diff: params.get(`diff`),
            });
            console.log(`newOpts`, opts);
        }

        if(mapHash) {
            console.log(`loading map ${mapHash}`)
    
            fetch(`https://api.beatsaver.com/maps/hash/${mapHash}`)
                .then(res => res.json())
                .then(data => {
                    console.log(`MAP`, data);
    
                    mapDetails = data;
                    thisVersion = data.versions.find(o => o.hash == mapHash.toLowerCase()) || {};

                    wallpaper.set({
                        url: thisVersion.coverURL || `https://cdn.beatsaver.com/${mapHash.toLowerCase()}.jpg`
                    });

                    const newState = {
                        title: data.name,
                        description: `Uploaded ${Math.floor((Date.now() - new Date(thisVersion.createdAt || data.uploaded).getTime())/8.64e+7)} days ago`,
                        image: thisVersion.coverURL || `https://cdn.beatsaver.com/${mapHash.toLowerCase()}.jpg`,
                        artist: data.metadata.songAuthorName,
                        mapper: data.metadata.levelAuthorName,
                        tags: [
                            {
                                icon: icon({name: 'angle-up'}),
                                value: data.stats.upvotes,
                                title: `${data.stats.upvotes} Upvotes`,
                                key: `upvotes`,
                                color: `#5ac452`
                            },
                            {
                                icon: icon({name: 'angle-down'}),
                                value: data.stats.downvotes,
                                title: `${data.stats.downvotes} Downvotes`,
                                key: `downvotes`,
                                color: `#c45262`
                            }
                        ],
                        diffTags: [],
                    }
    
                    setState({ ...state, ...newState});
    
                    const highest = thisVersion?.diffs.filter(o => o.characteristic == `Standard`).slice(-1)[0] || thisVersion.diffs.slice(-1)[0] || {}

                    const newOpts = {
                        ...opts,
                        char: opts.char || highest.characteristic,
                        diff: opts.diff || Object.entries(enums.diff).find(o => o[1] == highest.difficulty)[0],
                    }
    
                    setOpts(newOpts);
    
                    getScores(mapHash, newOpts, newState, 1);
                })
                .catch(err => {
                    console.error(err);

                    setState({
                        ...state,
                        title: `Map not found`,
                        description: `The map you are looking for could not be found.`,
                    })

                    setScores({
                        ...scores,
                        total: (<FontAwesomeIcon icon={icon({name: 'circle-exclamation'})} style={{width: `20px`, height: `20px`}} />)
                    })
                })
        }
    }, [params.get(`map`)])

    return (
        <div>
            <Heading mapper={state.mapper} image={state.image} artist={state.artist} title={state.title} description={state.description} tags={state.tags} diffTags={state.diffTags} />
            <Leaderboard error={scores.error} mapHash={scores.mapHash} total={scores.total} entries={(scores.entries || []).map(o => ({...o, key: `${o.id}`}))} offset={scores.offset} page={{
                current: scores.page,
                total: scores.totalPages,
                set: (hash, num) => getScores(hash, null, null, num)
            }} />
        </div>
    )
}