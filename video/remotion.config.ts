import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(95)
Config.setOverwriteOutput(true)
Config.setCodec('h264')
Config.setCrf(16)
Config.setPixelFormat('yuv420p')
Config.setConcurrency(4)
