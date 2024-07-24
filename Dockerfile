FROM node:latest

WORKDIR /usr/app

COPY package.json .

RUN npm install --quiet

COPY . .

EXPOSE 80

CMD ["npm", "run", "daemon"]