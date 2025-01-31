FROM node:23-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
