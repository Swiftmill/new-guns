FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=3000
ENV GUNS_DATA_ROOT=/data/guns
EXPOSE 3000
CMD ["npm", "start"]
