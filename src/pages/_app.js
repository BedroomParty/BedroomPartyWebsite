import React, { Component, useState, createContext } from 'react';
import { CookiesProvider } from 'react-cookie';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';

import '../styles/global.css'
import '../styles/sizes.css'
import '../styles/leaderboards.css'
import '../styles/elements.css'
import '../styles/navbar'
import '@fontsource/alata/index.css'

import '@fortawesome/fontawesome-svg-core/styles.css'

import Navbar from '../components/navbar';
import Footing from '../components/footing';

import { out } from '../../util/easings';

import { Context } from '../util/context';
import SEO from '../components/SEO';

export default function MyApp({ Component, pageProps, path, query, bpApiLocation }) {
    console.log(`MyApp`, {query, bpApiLocation, pageProps});

    Context.Props = pageProps;

    const page = (
        <CookiesProvider defaultSetOptions={{
            path: `/`,
            sameSite: `strict`,
            expires: new Date(Date.now() * 1.98e+7), // 5.5 hours; supposed to expire at 6 hours so let's keep it safe or something?
        }}>
            <div
                className="bg" 
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: `100vh`,
                    width: `100vw`,
                    backgroundSize: `cover`,
                    backgroundPosition: `center`,
                    backgroundRepeat: `no-repeat`,
                    position: `fixed`,
                    opacity: 0.5,
                    top: 0
                }} 
            />

            <div
                className="mg" 
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: `100vh`,
                    width: `100vw`,
                    position: `fixed`,
                    backgroundColor: `rgba(25, 25, 25, 0.6)`,
                    top: 0,
                }}
            />

            <div
                className="fg"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    position: `fixed`,
                    top: 0,
                    overflowY: `auto`,
                    overflowX: `hidden`,
                }}
            >
                <AnimatePresence>
                    <motion.div
                        key={ path }
                        transition={{ duration: 0.7, ease: out.expo, staggerChildren: 0.1 }}
                        initial={{ y: `10vh`, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: `-10vh`, opacity: 0 }}
                    >
                        <Component { ...pageProps } />
                    </motion.div>
                </AnimatePresence>
                <Footing />
            </div>

            <div
                className="tg" 
                style={{
                    pointerEvents: `none`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: `100vh`,
                    width: `100vw`,
                    position: `fixed`,
                    top: 0,
                }} 
            />

            <Navbar />
        </CookiesProvider>
    );

    return (
        <div>
            {
                Object.entries(Context).reduce((a, [key, B]) => {
                    if(B && B.Provider) {
                        const [ state, setState ] = useState(B._currentValue || { loading: true });

                        const keys = [
                            `${key[0].toLowerCase()}${key.slice(1)}`,
                            `set${key[0].toUpperCase()}${key.slice(1)}`
                        ];

                        console.debug(`Context: ${keys.join(` / `)}`);
    
                        return (
                            <B.Provider value={{ [keys[0]]: state, [keys[1]]: setState }}>
                                { a || page }
                            </B.Provider>
                        )
                    } else return a;
                }, null)
            }
        </div>
    );
}

import getServerSideProps from '../util/getServerSideProps';
export { getServerSideProps }