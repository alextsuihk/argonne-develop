############################################################
# build for production
#
############################################################

### TODO: move to Dockerfile

# exit when any command fails
# set -e

# # check if argument (docker tag ID) is provided
# if [ -z "$1" ]
#   then
#     echo "Please provide a tag ID for docker image. $ ./build.sh 1.2.3-dev"
# fi
# tag=$1


# # build common
# pushd common
# yarn build
# popd

# # build react
# pushd web
# yarn build
# popd

# # build express (with React bundled)
# pushd api
# yarn build
# popd

# biuld docker container
docker build -t inspirehk/argonne:$tag