import React from 'react'
import { Composition } from 'remotion'
import { NightwatchDemo } from './Main'
import tl from './timeline.json'

export const Root: React.FC = () => (
  <Composition id="NightwatchDemo" component={NightwatchDemo} durationInFrames={Math.round(tl.duration * tl.fps)} fps={tl.fps} width={1920} height={1080} />
)
