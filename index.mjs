import core from "@actions/core"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import fs from "fs"
import path from "path"
import slash from "slash"
import klawSync from "klaw-sync"
import { lookup } from "mime-types"

// Inputs
const ACCOUNT_ID = core.getInput("account_id", {
  required: true,
})
const R2_ACCESS_KEY = core.getInput("r2_access_key", {
  required: true,
})
const R2_SECRET_KEY = core.getInput("r2_secret_key", {
  required: true,
})
const R2_BUCKET = core.getInput("r2_bucket", {
  required: true,
})
const SOURCE_DIR = core.getInput("source_dir", {
  required: true,
})
const DESTINATION_DIR = core.getInput("destination_dir", {
  required: false,
})

// R2 Client
const client = new S3Client({
  credentials: {
    accessKeyId: R2_ACCESS_KEY, 
    secretAccessKey: R2_SECRET_KEY
  },
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`
})
const paths = klawSync(SOURCE_DIR, {
  nodir: true,
})

function upload(input) {
  return client.send(new PutObjectCommand(input))
    .then(() => {
      core.info(`Uploaded - ${input.Key}`)
    })
    .catch(err => core.error(err))
}

function run() {
  core.info("Starting...")
  const sourceDir = slash(path.join(process.cwd(), SOURCE_DIR))
  return Promise.all(
    paths.map((p) => {
      const fileStream = fs.createReadStream(p.path)
      const bucketPath = slash(
        path.join(DESTINATION_DIR, slash(path.relative(sourceDir, p.path)))
      )
      const input = {
        Bucket: R2_BUCKET,
        Body: fileStream,
        Key: bucketPath,
        ContentType: lookup(p.path) || "text/plain",
      }
      return upload(input)
    })
  )
}

run()
  .then(() => {
    core.info("Finished!")
  })
  .catch(err => {
    core.error(err)
    core.setFailed(err.message)
  })
