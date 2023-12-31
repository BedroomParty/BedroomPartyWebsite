import React, { Component } from 'react';
import Error from './errormsg'
import { motion, circOut, AnimatePresence } from 'framer-motion';
import { icon } from '@fortawesome/fontawesome-svg-core/import.macro'

import { Entry, EntryNoStyle, EntryStyle } from './leaderboard/entry';
import Splitter from './splitter';
import DetailBlock from './detailblock';

function navButton(props, direction) {
    if(!props.page) return null;

    const { page: { current, total, set } = {}, mapHash } = props;

    console.log(`page`, props.page)

    const constants = {
        disabled: {
            opacity: 0.5,
            pointerEvents: `none`,
        },
        enabled: {
            opacity: 1,
            cursor: `pointer`,
        }
    }

    if(direction == `next`) {
        Object.assign(constants, {
            style: {
                marginLeft: `8px`
            },
            icon: icon({name: 'chevron-circle-right'}),
        })

        if(current < total || total == -1) {
            return <DetailBlock style={{ ...constants.style, ...constants.enabled }} value={`${current+1}`} iconR={constants.icon} onClick={() => {
                console.log(`current`, current, `new`, `${current+1}`)
                set(mapHash, current+1);
            }} />
        } else {
            return <DetailBlock style={{ ...constants.style, ...constants.disabled }} value={`${current}`} iconR={constants.icon} />
        }
    } else if(direction == `prev`) {
        Object.assign(constants, {
            style: {
                marginRight: `8px`
            },
            icon: icon({name: 'chevron-circle-left'}),
        })

        if(current > 1) {
            return <DetailBlock style={{ ...constants.style, ...constants.enabled }} value={`${current-1}`} icon={constants.icon} onClick={() => {
                console.log(`current`, current, `new`, `${current-1}`)
                set(mapHash, current-1);
            }} />
        } else {
            return <DetailBlock style={{ ...constants.style, ...constants.disabled }} value={`${current}`} icon={constants.icon} />
        }
    }
}

function navButtons(props, {
    showText = true
}={}) {
    const { page } = props;

    return (
        <div style={{
            padding: `0px 14px`,
            width: `calc(100% - 28px)`,
            display: `flex`,
            flexDirection: `row`,
            alignItems: `center`,
            width: `100%`,
            marginBottom: `25px`,
            justifyContent: `space-between`,
        }}>
            {showText && ( <h3 style={{paddingBottom: `4px`}}>{props.heading || (typeof props.total == `number` ? `${props.total} score${props.total == 1 ? `` : `s`}` : props.total)}</h3> ) || null}
            <Splitter style={{ flexGrow: 1, margin: `0px 16px`, ...(!showText && {marginLeft: `0px`} || {}) }} />
            <AnimatePresence>
            { 
                (page && (page.total == -1 || (page.current <= page.total && page.total != 0))) ? (
                    <motion.div 
                        transition={{ duration: 0.2, ease: circOut }}
                        initial={{ opacity: 0, margin: `0px -50px`, scaleX: 0, x: 50 }}
                        animate={{ opacity: 1, margin: `0px 0px`, scaleX: 1, x: 0, }}
                        exit={{ opacity: 0, margin: `0px -50px`, scaleX: 0, x: 50 }}
                        style={{
                            display: `flex`,
                            flexDirection: `row`,
                            alignItems: `center`,
                            justifyContent: `center`,
                        }}
                    >
                        { navButton(props, `prev`) }
                        <h3 style={{paddingBottom: `4px`}}>page {page.current}{page.total > 0 && ` / ${page.total}`}</h3>
                        { navButton(props, `next`) }
                    </motion.div>
                ) : null 
            }
            </AnimatePresence>
        </div>
    )
}

function Leaderboard(props) {
    const { offset, error, loading } = props;

    const entries = !loading ? props.entries : [];

    console.log(`entries`, entries.length ? `[ ${entries.map(e => e.key).join(`, `)} ]` : entries.length);
    console.log(`error`, error)

    if(Array.isArray(props.entries) && (!error || !Object.keys(error).length)) {
        return (
            <div style={{
                width: `75vw`,
                maxWidth: `750px`,
            }}>
                { navButtons(props) }
                <div style={{
                    display: `flex`,
                    flexDirection: `column`,
                    alignItems: `baseline`,
                    justifyContent: `center`,
                    marginBottom: `8px`,
                    boxSizing: `border-box`,
                    textAlign: `center`,
                    width: `100%`,
                    overflowX: `auto`,
                }}>
                    <AnimatePresence>
                        {
                            entries.map((entry, index) => (
                                <Entry
                                    key={entry.key || `${Number(index) + 1 + (offset || 0)}`}
                                    transition={{ duration: 0.2, ease: circOut, delay: index * 0.03 }}
                                    initial={{ opacity: 0, x: 300, }}
                                    animate={{ opacity: 1, x: 0, }}
                                    exit={{ opacity: 0, x: -300, }}
                                    style={{
                                        ...( !entry ? ({
                                            opacity: 0.4,
                                            pointerEvents: `none`,
                                        }) : ({}) )
                                    }}

                                    entry={entry}
                                >
                                    { entry && typeof entry == `object` && !entry.empty ? (
                                        <EntryNoStyle index={Number(index)} position={Number(index) + 1 + (offset || 0)} entry={entry} />
                                    ) : (
                                        <h5 style={{ opacity: 0.3 }}>-- no entry --</h5>
                                    ) }
                                </Entry>
                            ))
                        }
                    </AnimatePresence>
                </div>
                { navButtons(props, { showText: false }) }
            </div>
        );
    } else if(error) return (
        <Error title={error?.title || (!entries.length ? `No entries` : `Error`)} description={error?.description || (!entries.length ? `There are no entries in this leaderboard` : `Unknown error.`)} />
    )
}

export default Leaderboard;